/**
 * Unit tests for achievement service business logic
 * TDD: written BEFORE implementation
 */

// ─── computeSummary pure logic ────────────────────────────────────────────────

describe('computeSummaryFromRawStars', () => {
  // import dynamically after we implement it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let computeSummaryFromRawStars: (rawStars: number) => any;

  beforeAll(async () => {
    const mod = await import('../../src/services/achievementService.js');
    computeSummaryFromRawStars = mod.computeSummaryFromRawStars;
  });

  it('0 raw stars → stars=0, moons=0, suns=0, level=1', () => {
    const r = computeSummaryFromRawStars(0);
    expect(r.stars).toBe(0);
    expect(r.moons).toBe(0);
    expect(r.suns).toBe(0);
    expect(r.level).toBe(1);
    expect(r.levelTitle).toBe('时间小新手');
  });

  it('9 raw stars → stars=9, moons=0, suns=0, level=1', () => {
    const r = computeSummaryFromRawStars(9);
    expect(r.stars).toBe(9);
    expect(r.moons).toBe(0);
    expect(r.suns).toBe(0);
    expect(r.level).toBe(1);
  });

  it('10 raw stars → stars=0, moons=1, suns=0', () => {
    const r = computeSummaryFromRawStars(10);
    expect(r.stars).toBe(0);
    expect(r.moons).toBe(1);
    expect(r.suns).toBe(0);
  });

  it('15 raw stars → stars=5, moons=1, suns=0', () => {
    const r = computeSummaryFromRawStars(15);
    expect(r.stars).toBe(5);
    expect(r.moons).toBe(1);
    expect(r.suns).toBe(0);
  });

  it('100 raw stars → stars=0, moons=0, suns=1', () => {
    const r = computeSummaryFromRawStars(100);
    expect(r.stars).toBe(0);
    expect(r.moons).toBe(0);
    expect(r.suns).toBe(1);
  });

  it('125 raw stars → stars=5, moons=2, suns=1', () => {
    const r = computeSummaryFromRawStars(125);
    expect(r.stars).toBe(5);
    expect(r.moons).toBe(2);
    expect(r.suns).toBe(1);
  });

  it('level thresholds: 10 raw stars → level=2 "时间管理学徒"', () => {
    const r = computeSummaryFromRawStars(10);
    expect(r.level).toBe(2);
    expect(r.levelTitle).toBe('时间管理学徒');
  });

  it('level thresholds: 25 raw stars → level=3 "时间规划师"', () => {
    const r = computeSummaryFromRawStars(25);
    expect(r.level).toBe(3);
    expect(r.levelTitle).toBe('时间规划师');
  });

  it('level thresholds: 45 raw stars → level=4 "效率达人"', () => {
    const r = computeSummaryFromRawStars(45);
    expect(r.level).toBe(4);
    expect(r.levelTitle).toBe('效率达人');
  });

  it('level thresholds: 70 raw stars → level=5 "时间大师"', () => {
    const r = computeSummaryFromRawStars(70);
    expect(r.level).toBe(5);
    expect(r.levelTitle).toBe('时间大师');
  });

  it('starsToNextLevel is correct for level 1 (need 10 total)', () => {
    const r = computeSummaryFromRawStars(3);
    expect(r.starsToNextLevel).toBe(10 - 3); // 7
  });

  it('starsToNextLevel is correct for level 2 (need 25 total)', () => {
    const r = computeSummaryFromRawStars(15);
    expect(r.starsToNextLevel).toBe(25 - 15); // 10
  });

  it('starsToNextLevel is 0 at max level', () => {
    const r = computeSummaryFromRawStars(200);
    expect(r.starsToNextLevel).toBe(0);
  });
});

// ─── computeWeeklyStats pure logic ───────────────────────────────────────────

describe('computeWeeklyStats', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let computeWeeklyStats: (records: Array<{ date: string; stars: number }>, today: string) => any;

  beforeAll(async () => {
    const mod = await import('../../src/services/achievementService.js');
    computeWeeklyStats = mod.computeWeeklyStats;
  });

  it('returns 0 for empty records', () => {
    const r = computeWeeklyStats([], '2024-01-15');
    expect(r.starsThisWeek).toBe(0);
    expect(r.moonsThisWeek).toBe(0);
  });

  it('sums stars within current week (Mon-Sun)', () => {
    // 2024-01-15 is Monday
    const records = [
      { date: '2024-01-15', stars: 3 },
      { date: '2024-01-16', stars: 2 },
      { date: '2024-01-14', stars: 5 }, // previous Sunday, outside week
    ];
    const r = computeWeeklyStats(records, '2024-01-16');
    expect(r.starsThisWeek).toBe(5);
  });

  it('computes moonsThisWeek = floor(starsThisWeek / 10)', () => {
    const records = [
      { date: '2024-01-15', stars: 12 },
    ];
    const r = computeWeeklyStats(records, '2024-01-15');
    expect(r.starsThisWeek).toBe(12);
    expect(r.moonsThisWeek).toBe(1);
  });
});
