import { PrismaClient, Habit, HabitCheckin } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateHabitData {
  childId: string;
  createdById: string;
  name: string;
  icon: string;
  frequency: string;
  weekdays?: string | null;
  rewardStars: number;
}

export async function createHabit(data: CreateHabitData): Promise<Habit> {
  return prisma.habit.create({ data });
}

export async function findHabitsByChildId(childId: string): Promise<Habit[]> {
  return prisma.habit.findMany({
    where: { childId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findHabitById(id: string): Promise<Habit | null> {
  return prisma.habit.findUnique({ where: { id } });
}

export async function updateHabit(id: string, data: Partial<CreateHabitData & { isActive: boolean }>): Promise<Habit> {
  return prisma.habit.update({ where: { id }, data });
}

export async function deleteHabit(id: string): Promise<void> {
  await prisma.habit.delete({ where: { id } });
}

export async function createCheckin(habitId: string, childId: string, date: string): Promise<HabitCheckin> {
  return prisma.habitCheckin.create({ data: { habitId, childId, date } });
}

export async function deleteCheckin(habitId: string, childId: string, date: string): Promise<void> {
  await prisma.habitCheckin.deleteMany({ where: { habitId, childId, date } });
}

export async function findCheckin(habitId: string, childId: string, date: string): Promise<HabitCheckin | null> {
  return prisma.habitCheckin.findUnique({
    where: { habitId_childId_date: { habitId, childId, date } },
  });
}

export async function findCheckinsByChildAndDate(childId: string, date: string): Promise<HabitCheckin[]> {
  return prisma.habitCheckin.findMany({ where: { childId, date } });
}

// Get consecutive streak (days in a row ending today/yesterday)
export async function getStreak(habitId: string, childId: string): Promise<number> {
  const checkins = await prisma.habitCheckin.findMany({
    where: { habitId, childId },
    orderBy: { date: 'desc' },
  });
  if (checkins.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < checkins.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (checkins[i].date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
