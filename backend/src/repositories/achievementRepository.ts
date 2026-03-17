import { PrismaClient, Achievement } from '@prisma/client';

const prisma = new PrismaClient();

export async function findOrCreateDailyRecord(userId: string, date: string): Promise<Achievement> {
  const existing = await prisma.achievement.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) return existing;
  return prisma.achievement.create({
    data: { userId, date, stars: 0, moons: 0, suns: 0, totalFocusMin: 0, tasksCompleted: 0 },
  });
}

export async function addStarsToDay(userId: string, date: string, stars: number): Promise<Achievement> {
  await findOrCreateDailyRecord(userId, date);
  return prisma.achievement.update({
    where: { userId_date: { userId, date } },
    data: { stars: { increment: stars } },
  });
}

export async function getTotalRawStars(userId: string): Promise<number> {
  const agg = await prisma.achievement.aggregate({
    where: { userId },
    _sum: { stars: true },
  });
  return agg._sum.stars ?? 0;
}

/** Override raw stars for debug/testing purposes */
export async function setTotalRawStars(userId: string, targetRawStars: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  // Delete all achievement records and set a single record with the target value
  await prisma.achievement.deleteMany({ where: { userId } });
  if (targetRawStars > 0) {
    await prisma.achievement.create({
      data: { userId, date: today, stars: targetRawStars, moons: 0, suns: 0 },
    });
  }
}

export async function getHistoryByUserId(
  userId: string,
  year: number,
  month: number
): Promise<Achievement[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  return prisma.achievement.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });
}

export async function getHistoryRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Achievement[]> {
  return prisma.achievement.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });
}

export async function getAllHistory(userId: string): Promise<Achievement[]> {
  return prisma.achievement.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });
}
