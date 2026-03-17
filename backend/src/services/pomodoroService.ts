import * as pomodoroRepo from '../repositories/pomodoroRepository.js';
import * as taskRepo from '../repositories/taskRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { createError } from '../middleware/errorHandler.js';
import { PomodoroSession } from '@prisma/client';

const VALID_TYPES = ['focus', 'break'];

/**
 * 校验用户对任务的访问权限：
 * - 孩子只能操作分配给自己的任务
 * - 家长只能操作自己孩子的任务
 */
async function assertTaskAccess(
  userId: string,
  role: string,
  taskId: string
): Promise<Awaited<ReturnType<typeof taskRepo.findTaskById>>> {
  const task = await taskRepo.findTaskById(taskId);
  if (!task) throw createError('任务不存在', 404);

  if (role === 'child') {
    if (task.childId !== userId) throw createError('无权操作该任务', 403);
  } else if (role === 'parent') {
    const children = await userRepo.findChildrenByParentId(userId);
    const hasChild = children.some((f) => f.childId === task.childId);
    if (!hasChild) throw createError('无权操作该任务', 403);
  }

  return task;
}

export interface StartSessionParams {
  type: string;
  durationMin?: number;
}

export async function startSession(
  userId: string,
  role: string,
  taskId: string,
  params: StartSessionParams
): Promise<PomodoroSession> {
  if (!VALID_TYPES.includes(params.type)) {
    throw createError('type 无效，可选值: focus, break', 400);
  }

  await assertTaskAccess(userId, role, taskId);

  const defaultDuration = params.type === 'focus' ? 25 : 5;

  return pomodoroRepo.createSession({
    taskId,
    userId,
    type: params.type as 'focus' | 'break',
    durationMin: params.durationMin ?? defaultDuration,
  });
}

export async function endSession(
  userId: string,
  role: string,
  sessionId: string,
  completed: boolean
): Promise<PomodoroSession> {
  const session = await pomodoroRepo.findSessionById(sessionId);
  if (!session) throw createError('Session 不存在', 404);

  if (session.endedAt !== null) throw createError('该 session 已结束', 409);

  // 校验操作权限
  if (role === 'child' && session.userId !== userId) {
    throw createError('无权操作该 session', 403);
  }
  if (role === 'parent') {
    const task = await taskRepo.findTaskById(session.taskId);
    if (task) {
      const children = await userRepo.findChildrenByParentId(userId);
      const hasChild = children.some((f) => f.childId === task.childId);
      if (!hasChild) throw createError('无权操作该 session', 403);
    }
  }

  return pomodoroRepo.endSession(sessionId, completed);
}

export interface SessionSummary {
  taskId: string;
  totalFocusMin: number;
  totalBreakMin: number;
  completedPomodoros: number;
  sessions: PomodoroSession[];
}

export async function getSessionSummary(
  userId: string,
  role: string,
  taskId: string
): Promise<SessionSummary> {
  await assertTaskAccess(userId, role, taskId);

  const sessions = await pomodoroRepo.findSessionsByTaskId(taskId);

  const completedFocusSessions = sessions.filter(
    (s) => s.type === 'focus' && s.completed
  );
  const completedBreakSessions = sessions.filter(
    (s) => s.type === 'break' && s.completed
  );

  return {
    taskId,
    totalFocusMin: completedFocusSessions.reduce((sum, s) => sum + s.durationMin, 0),
    totalBreakMin: completedBreakSessions.reduce((sum, s) => sum + s.durationMin, 0),
    completedPomodoros: completedFocusSessions.length,
    sessions,
  };
}

export async function getSessionsByTask(
  userId: string,
  role: string,
  taskId: string,
  type?: string
): Promise<PomodoroSession[]> {
  await assertTaskAccess(userId, role, taskId);
  return pomodoroRepo.findSessionsByTaskId(taskId, type);
}
