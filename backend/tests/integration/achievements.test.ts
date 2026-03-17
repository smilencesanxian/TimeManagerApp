/**
 * Integration tests for achievement routes
 * TDD: written BEFORE implementation
 */
import 'dotenv/config';
import request from 'supertest';
import { execSync } from 'child_process';
import { createApp } from '../../src/app';

process.env['DATABASE_URL'] = 'file:./test-achievements.db';
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret';

const app = createApp();

let parentToken: string;
let childToken: string;
let childId: string;

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: 'file:./test-achievements.db' },
    stdio: 'pipe',
  });
});

afterAll(() => {
  try {
    execSync('rm -f ./test-achievements.db ./test-achievements.db-journal ./test-achievements.db-wal ./test-achievements.db-shm', {
      stdio: 'pipe',
    });
  } catch { /* ignore */ }
});

describe('Setup: create parent & child, bind family', () => {
  it('should register parent', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900000030',
      password: 'password123',
      nickname: '测试家长成就',
      role: 'parent',
    });
    expect(res.status).toBe(201);
    parentToken = res.body.data.accessToken;
  });

  it('should register child', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900000031',
      password: 'password123',
      nickname: '测试孩子成就',
      role: 'child',
    });
    expect(res.status).toBe(201);
    childToken = res.body.data.accessToken;
    childId = res.body.data.user.id;
  });

  it('should bind parent and child', async () => {
    const inviteRes = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childNickname: '测试孩子成就' });
    expect(inviteRes.status).toBe(200);
    const code = inviteRes.body.data.inviteCode;

    const bindRes = await request(app)
      .post('/api/v1/auth/bind')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ inviteCode: code });
    expect(bindRes.status).toBe(200);
  });
});

// ─── GET /achievements/summary ───────────────────────────────────────────────

describe('GET /achievements/summary', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/achievements/summary');
    expect(res.status).toBe(401);
  });

  it('returns default summary with 0 values for new child', async () => {
    const res = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.stars).toBe(0);
    expect(res.body.data.moons).toBe(0);
    expect(res.body.data.suns).toBe(0);
    expect(res.body.data.level).toBe(1);
    expect(res.body.data.levelTitle).toBe('时间小新手');
    expect(typeof res.body.data.starsToNextLevel).toBe('number');
  });
});

// ─── GET /achievements/history ───────────────────────────────────────────────

describe('GET /achievements/history', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/achievements/history');
    expect(res.status).toBe(401);
  });

  it('returns empty array for new child', async () => {
    const res = await request(app)
      .get('/api/v1/achievements/history')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('supports year and month query params', async () => {
    const res = await request(app)
      .get('/api/v1/achievements/history?year=2024&month=1')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── GET /achievements/weekly ────────────────────────────────────────────────

describe('GET /achievements/weekly', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/achievements/weekly');
    expect(res.status).toBe(401);
  });

  it('returns starsThisWeek and moonsThisWeek', async () => {
    const res = await request(app)
      .get('/api/v1/achievements/weekly')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.starsThisWeek).toBe('number');
    expect(typeof res.body.data.moonsThisWeek).toBe('number');
  });
});

// ─── Stars awarded on habit checkin ──────────────────────────────────────────

describe('Stars awarded on habit checkin', () => {
  let habitId: string;

  it('parent creates habit with rewardStars=2', async () => {
    const res = await request(app)
      .post('/api/v1/habits')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, name: '测试习惯', icon: '📚', frequency: 'daily', rewardStars: 2 });
    expect(res.status).toBe(201);
    habitId = res.body.data.id;
  });

  it('child checks in habit → summary stars += 2', async () => {
    const before = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    const rawBefore = before.body.data.stars + before.body.data.moons * 10 + before.body.data.suns * 100;

    await request(app)
      .post(`/api/v1/habits/${habitId}/checkin`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({});

    const after = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    const rawAfter = after.body.data.stars + after.body.data.moons * 10 + after.body.data.suns * 100;

    expect(rawAfter).toBe(rawBefore + 2);
  });
});

// ─── Stars awarded on task completion ────────────────────────────────────────

describe('Stars awarded on task completion', () => {
  let taskId: string;

  it('parent creates task for child', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, date: today, subject: '数学', title: '成就测试任务', duration: 25 });
    expect(res.status).toBe(201);
    taskId = res.body.data.id;
  });

  it('child marks task done → summary stars += 1', async () => {
    const before = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    const rawBefore = before.body.data.stars + before.body.data.moons * 10 + before.body.data.suns * 100;

    await request(app)
      .put(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ status: 'done' });

    const after = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    const rawAfter = after.body.data.stars + after.body.data.moons * 10 + after.body.data.suns * 100;

    expect(rawAfter).toBe(rawBefore + 1);
  });

  it('marking task done twice should not double-award stars', async () => {
    const before = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    const rawBefore = before.body.data.stars + before.body.data.moons * 10 + before.body.data.suns * 100;

    // Mark done again (already done)
    await request(app)
      .put(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ status: 'done' });

    const after = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    const rawAfter = after.body.data.stars + after.body.data.moons * 10 + after.body.data.suns * 100;

    expect(rawAfter).toBe(rawBefore); // no change
  });
});

// ─── Auto conversion: 10 stars → 1 moon ──────────────────────────────────────

describe('Auto conversion: 10 stars → 1 moon', () => {
  it('debug set-stars to 9, then checkin (rewardStars=1) → 10 stars → 1 moon', async () => {
    // Set stars to 9 via debug API
    const setRes = await request(app)
      .post('/api/v1/achievements/debug/set-stars')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, stars: 9 });
    expect(setRes.status).toBe(200);

    // Create and check in a habit with rewardStars=1
    const habitRes = await request(app)
      .post('/api/v1/habits')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, name: '转换测试习惯', icon: '⭐', frequency: 'daily', rewardStars: 1 });
    const hid = habitRes.body.data.id;

    await request(app)
      .post(`/api/v1/habits/${hid}/checkin`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({});

    const after = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);

    expect(after.body.data.moons).toBeGreaterThanOrEqual(1);
    expect(after.body.data.stars).toBeLessThan(10);
  });
});

// ─── Debug API ────────────────────────────────────────────────────────────────

describe('Debug API', () => {
  it('POST /achievements/debug/set-stars sets raw stars', async () => {
    const res = await request(app)
      .post('/api/v1/achievements/debug/set-stars')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, stars: 5 });
    expect(res.status).toBe(200);

    const summary = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    const rawTotal = summary.body.data.stars + summary.body.data.moons * 10 + summary.body.data.suns * 100;
    expect(rawTotal).toBe(5);
  });

  it('POST /achievements/debug/set-rewards sets stars/moons/suns raw equivalent', async () => {
    const res = await request(app)
      .post('/api/v1/achievements/debug/set-rewards')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, stars: 5, moons: 2, suns: 0 });
    expect(res.status).toBe(200);

    const summary = await request(app)
      .get('/api/v1/achievements/summary')
      .set('Authorization', `Bearer ${childToken}`);
    expect(summary.body.data.stars).toBe(5);
    expect(summary.body.data.moons).toBe(2);
  });

  it('requires parent auth for debug APIs', async () => {
    const res = await request(app)
      .post('/api/v1/achievements/debug/set-stars')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ childId, stars: 5 });
    expect(res.status).toBe(403);
  });
});
