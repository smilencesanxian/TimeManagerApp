import * as achievementRepo from '../repositories/achievementRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { createError } from '../middleware/errorHandler.js';

// ─── Level config ──────────────────────────────────────────────────────────────

interface LevelRule {
  level: number;
  title: string;
  minStars: number;
  maxStars: number;
}

const LEVEL_RULES: LevelRule[] = [
  { level: 1, title: '时间小新手',   minStars: 0,  maxStars: 9  },
  { level: 2, title: '时间管理学徒', minStars: 10, maxStars: 24 },
  { level: 3, title: '时间规划师',   minStars: 25, maxStars: 44 },
  { level: 4, title: '效率达人',     minStars: 45, maxStars: 69 },
  { level: 5, title: '时间大师',     minStars: 70, maxStars: Infinity },
];

// ─── Pure functions (exported for unit tests) ─────────────────────────────────

export interface AchievementSummary {
  stars: number;
  moons: number;
  suns: number;
  level: number;
  levelTitle: string;
  starsToNextLevel: number;
}

/**
 * Compute wallet state and level from cumulative raw stars.
 * 10 raw stars → 1 moon; 10 moons → 1 sun (i.e. 100 raw stars → 1 sun)
 */
export function computeSummaryFromRawStars(rawStars: number): AchievementSummary {
  const suns = Math.floor(rawStars / 100);
  const remaining = rawStars % 100;
  const moons = Math.floor(remaining / 10);
  const stars = remaining % 10;

  const rule = LEVEL_RULES.find((r) => rawStars >= r.minStars && rawStars <= r.maxStars)
    ?? LEVEL_RULES[LEVEL_RULES.length - 1];

  const nextRule = LEVEL_RULES.find((r) => r.level === rule.level + 1);
  const starsToNextLevel = nextRule ? nextRule.minStars - rawStars : 0;

  return {
    stars,
    moons,
    suns,
    level: rule.level,
    levelTitle: rule.title,
    starsToNextLevel: Math.max(0, starsToNextLevel),
  };
}

export interface WeeklyStats {
  starsThisWeek: number;
  moonsThisWeek: number;
}

/**
 * Compute this week's (Mon–Sun containing today) star/moon stats.
 */
export function computeWeeklyStats(
  records: Array<{ date: string; stars: number }>,
  today: string
): WeeklyStats {
  const todayDate = new Date(today + 'T00:00:00Z');
  // Get Monday of this week
  const dayOfWeek = todayDate.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(todayDate);
  monday.setUTCDate(todayDate.getUTCDate() - daysFromMonday);
  const mondayStr = monday.toISOString().slice(0, 10);

  // Sum stars from Monday to today (inclusive)
  const starsThisWeek = records
    .filter((r) => r.date >= mondayStr && r.date <= today)
    .reduce((sum, r) => sum + r.stars, 0);

  const moonsThisWeek = Math.floor(starsThisWeek / 10);

  return { starsThisWeek, moonsThisWeek };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function awardStars(userId: string, stars: number): Promise<AchievementSummary> {
  const today = new Date().toISOString().slice(0, 10);
  await achievementRepo.addStarsToDay(userId, today, stars);
  const rawTotal = await achievementRepo.getTotalRawStars(userId);
  return computeSummaryFromRawStars(rawTotal);
}

export async function getSummary(userId: string): Promise<AchievementSummary> {
  const rawTotal = await achievementRepo.getTotalRawStars(userId);
  return computeSummaryFromRawStars(rawTotal);
}

export interface HistoryRecord {
  date: string;
  stars: number;
}

export async function getHistory(
  userId: string,
  year: number,
  month: number
): Promise<HistoryRecord[]> {
  const records = await achievementRepo.getHistoryByUserId(userId, year, month);
  return records.map((r) => ({ date: r.date, stars: r.stars }));
}

export async function getWeeklySummary(userId: string): Promise<WeeklyStats> {
  const today = new Date().toISOString().slice(0, 10);
  const allRecords = await achievementRepo.getAllHistory(userId);
  return computeWeeklyStats(
    allRecords.map((r) => ({ date: r.date, stars: r.stars })),
    today
  );
}

// ─── Debug helpers (parent-only) ──────────────────────────────────────────────

async function assertParentHasChild(parentId: string, childId: string): Promise<void> {
  const children = await userRepo.findChildrenByParentId(parentId);
  if (!children.some((f) => f.childId === childId)) {
    throw createError('无权操作该孩子的成就数据', 403);
  }
}

export async function debugSetStars(
  parentId: string,
  childId: string,
  stars: number
): Promise<void> {
  await assertParentHasChild(parentId, childId);
  await achievementRepo.setTotalRawStars(childId, stars);
}

export async function debugSetRewards(
  parentId: string,
  childId: string,
  stars: number,
  moons: number,
  suns: number
): Promise<void> {
  await assertParentHasChild(parentId, childId);
  // Convert wallet state back to raw stars: stars + moons*10 + suns*100
  const rawStars = stars + moons * 10 + suns * 100;
  await achievementRepo.setTotalRawStars(childId, rawStars);
}
