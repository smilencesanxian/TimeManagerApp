import * as habitRepo from '../repositories/habitRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import * as achievementService from './achievementService.js';
import { createError } from '../middleware/errorHandler.js';
import { Habit } from '@prisma/client';

const VALID_FREQUENCIES = ['daily', 'weekly'];

async function assertParentHasChild(parentId: string, childId: string): Promise<void> {
  const children = await userRepo.findChildrenByParentId(parentId);
  if (!children.some((f) => f.childId === childId)) {
    throw createError('无权操作该孩子的习惯', 403);
  }
}

async function assertHabitBelongsToChild(habitId: string, childId: string): Promise<Habit> {
  const habit = await habitRepo.findHabitById(habitId);
  if (!habit || !habit.isActive) throw createError('习惯不存在', 404);
  if (habit.childId !== childId) throw createError('无权操作该习惯', 403);
  return habit;
}

async function assertParentOwnsHabit(habitId: string, parentId: string): Promise<Habit> {
  const habit = await habitRepo.findHabitById(habitId);
  if (!habit || !habit.isActive) throw createError('习惯不存在', 404);
  if (habit.createdById !== parentId) {
    // also check if parent has that child
    const children = await userRepo.findChildrenByParentId(parentId);
    if (!children.some((f) => f.childId === habit.childId)) {
      throw createError('无权操作该习惯', 403);
    }
  }
  return habit;
}

export interface CreateHabitParams {
  childId: string;
  name: string;
  icon?: string;
  frequency?: string;
  weekdays?: number[];
  rewardStars?: number;
}

export interface HabitWithCheckin extends Habit {
  checkedIn: boolean;
  streak: number;
}

export async function createHabit(parentId: string, params: CreateHabitParams): Promise<Habit> {
  await assertParentHasChild(parentId, params.childId);

  if (!params.name || params.name.trim().length === 0) {
    throw createError('习惯名称不能为空', 400);
  }
  const frequency = params.frequency ?? 'daily';
  if (!VALID_FREQUENCIES.includes(frequency)) {
    throw createError('频率无效，可选值: daily, weekly', 400);
  }
  if (frequency === 'weekly' && (!params.weekdays || params.weekdays.length === 0)) {
    throw createError('每周习惯需指定打卡日', 400);
  }

  return habitRepo.createHabit({
    childId: params.childId,
    createdById: parentId,
    name: params.name.trim(),
    icon: params.icon ?? '📚',
    frequency,
    weekdays: params.weekdays ? JSON.stringify(params.weekdays) : null,
    rewardStars: params.rewardStars ?? 1,
  });
}

export async function getHabits(
  userId: string,
  role: string,
  childId?: string
): Promise<HabitWithCheckin[]> {
  const targetChildId = role === 'child' ? userId : childId;
  if (!targetChildId) throw createError('需要指定 childId', 400);

  if (role === 'parent') {
    const children = await userRepo.findChildrenByParentId(userId);
    if (!children.some((f) => f.childId === targetChildId)) {
      throw createError('无权查看该孩子的习惯', 403);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const habits = await habitRepo.findHabitsByChildId(targetChildId);
  const checkins = await habitRepo.findCheckinsByChildAndDate(targetChildId, today);
  const checkedIds = new Set(checkins.map((c) => c.habitId));

  return Promise.all(habits.map(async (h) => {
    const streak = await habitRepo.getStreak(h.id, targetChildId);
    return { ...h, checkedIn: checkedIds.has(h.id), streak };
  }));
}

export async function getHabitById(habitId: string, userId: string, role: string): Promise<HabitWithCheckin> {
  const habit = await habitRepo.findHabitById(habitId);
  if (!habit || !habit.isActive) throw createError('习惯不存在', 404);

  if (role === 'child' && habit.childId !== userId) throw createError('无权查看该习惯', 403);
  if (role === 'parent') {
    const children = await userRepo.findChildrenByParentId(userId);
    if (!children.some((f) => f.childId === habit.childId)) throw createError('无权查看该习惯', 403);
  }

  const today = new Date().toISOString().slice(0, 10);
  const checkin = await habitRepo.findCheckin(habitId, habit.childId, today);
  const streak = await habitRepo.getStreak(habitId, habit.childId);
  return { ...habit, checkedIn: !!checkin, streak };
}

export async function updateHabit(
  habitId: string,
  parentId: string,
  params: Partial<CreateHabitParams>
): Promise<Habit> {
  await assertParentOwnsHabit(habitId, parentId);

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) {
    if (!params.name.trim()) throw createError('习惯名称不能为空', 400);
    updateData['name'] = params.name.trim();
  }
  if (params.icon !== undefined) updateData['icon'] = params.icon;
  if (params.frequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(params.frequency)) throw createError('频率无效', 400);
    updateData['frequency'] = params.frequency;
  }
  if (params.weekdays !== undefined) updateData['weekdays'] = JSON.stringify(params.weekdays);
  if (params.rewardStars !== undefined) updateData['rewardStars'] = params.rewardStars;

  return habitRepo.updateHabit(habitId, updateData as Parameters<typeof habitRepo.updateHabit>[1]);
}

export async function deleteHabit(habitId: string, parentId: string): Promise<void> {
  await assertParentOwnsHabit(habitId, parentId);
  await habitRepo.deleteHabit(habitId);
}

export interface CheckinResult {
  checkedIn: boolean;
  rewardStars: number;
  streak: number;
}

export async function checkIn(habitId: string, childId: string): Promise<CheckinResult> {
  const habit = await assertHabitBelongsToChild(habitId, childId);
  const today = new Date().toISOString().slice(0, 10);
  const existing = await habitRepo.findCheckin(habitId, childId, today);
  if (existing) throw createError('今日已打卡', 409);

  await habitRepo.createCheckin(habitId, childId, today);
  // Award stars for habit checkin
  await achievementService.awardStars(childId, habit.rewardStars);
  const streak = await habitRepo.getStreak(habitId, childId);
  return { checkedIn: true, rewardStars: habit.rewardStars, streak };
}

export async function cancelCheckIn(habitId: string, childId: string): Promise<{ checkedIn: boolean; rewardStars: number }> {
  const habit = await assertHabitBelongsToChild(habitId, childId);
  const today = new Date().toISOString().slice(0, 10);
  await habitRepo.deleteCheckin(habitId, childId, today);
  return { checkedIn: false, rewardStars: habit.rewardStars };
}

export async function getTodayCheckin(habitId: string, childId: string): Promise<{ checkedIn: boolean }> {
  await assertHabitBelongsToChild(habitId, childId);
  const today = new Date().toISOString().slice(0, 10);
  const checkin = await habitRepo.findCheckin(habitId, childId, today);
  return { checkedIn: !!checkin };
}
