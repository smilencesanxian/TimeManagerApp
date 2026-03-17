import 'dotenv/config';
import request from 'supertest';
import { execSync } from 'child_process';
import { createApp } from '../../src/app';

process.env['DATABASE_URL'] = 'file:./test-habits.db';
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret';

const app = createApp();

let parentToken: string;
let childToken: string;
let childId: string;
let habitId: string;

beforeAll(() => {
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: 'file:./test-habits.db' },
    stdio: 'pipe',
  });
});

afterAll(() => {
  try {
    execSync('rm -f ./test-habits.db ./test-habits.db-journal ./test-habits.db-wal ./test-habits.db-shm', {
      stdio: 'pipe',
    });
  } catch { /* ignore */ }
});

// ──── 准备账号 ────────────────────────────────────────────────

describe('Setup: create parent & child, bind family', () => {
  it('should register parent', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900000020',
      password: 'password123',
      nickname: '测试家长Habit',
      role: 'parent',
    });
    expect(res.status).toBe(201);
    parentToken = res.body.data.accessToken;
  });

  it('should register child', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900000021',
      password: 'password123',
      nickname: '测试孩子Habit',
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
      .send({ childNickname: '测试孩子Habit' });
    expect(inviteRes.status).toBe(200);
    const inviteCode = inviteRes.body.data.inviteCode;

    const bindRes = await request(app)
      .post('/api/v1/auth/bind')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ inviteCode });
    expect(bindRes.status).toBe(200);
  });
});

// ──── 创建习惯 ────────────────────────────────────────────────

describe('POST /api/v1/habits', () => {
  it('should create habit as parent', async () => {
    const res = await request(app)
      .post('/api/v1/habits')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        name: '每天阅读',
        icon: '📚',
        frequency: 'daily',
        rewardStars: 2,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('每天阅读');
    expect(res.body.data.rewardStars).toBe(2);
    expect(res.body.data.isActive).toBe(true);
    habitId = res.body.data.id;
  });

  it('should create weekly habit with weekdays', async () => {
    const res = await request(app)
      .post('/api/v1/habits')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        name: '周末运动',
        icon: '🏃',
        frequency: 'weekly',
        weekdays: [6, 7],
        rewardStars: 3,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.frequency).toBe('weekly');
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/habits')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, icon: '📚' });
    expect(res.status).toBe(400);
  });

  it('should return 400 when childId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/habits')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: '阅读' });
    expect(res.status).toBe(400);
  });

  it('should return 403 when child tries to create habit', async () => {
    const res = await request(app)
      .post('/api/v1/habits')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ childId, name: '阅读', frequency: 'daily' });
    expect(res.status).toBe(403);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/v1/habits')
      .send({ childId, name: '阅读', frequency: 'daily' });
    expect(res.status).toBe(401);
  });

  it('should return 400 for weekly habit without weekdays', async () => {
    const res = await request(app)
      .post('/api/v1/habits')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, name: '周习惯', frequency: 'weekly' });
    expect(res.status).toBe(400);
  });
});

// ──── 查询习惯列表 ────────────────────────────────────────────────

describe('GET /api/v1/habits', () => {
  it('child should get own habits', async () => {
    const res = await request(app)
      .get('/api/v1/habits')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    // Should include checkedIn and streak fields
    expect(res.body.data[0]).toHaveProperty('checkedIn');
    expect(res.body.data[0]).toHaveProperty('streak');
  });

  it('parent should get child habits with childId param', async () => {
    const res = await request(app)
      .get(`/api/v1/habits?childId=${childId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('parent without childId should return 400', async () => {
    const res = await request(app)
      .get('/api/v1/habits')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(400);
  });
});

// ──── 获取单个习惯 ────────────────────────────────────────────────

describe('GET /api/v1/habits/:id', () => {
  it('parent should get habit by id', async () => {
    const res = await request(app)
      .get(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(habitId);
    expect(res.body.data).toHaveProperty('checkedIn');
    expect(res.body.data).toHaveProperty('streak');
  });

  it('child should get own habit by id', async () => {
    const res = await request(app)
      .get(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(habitId);
  });

  it('should return 404 for non-existent habit', async () => {
    const res = await request(app)
      .get('/api/v1/habits/non-existent-id')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(404);
  });
});

// ──── 更新习惯 ────────────────────────────────────────────────

describe('PUT /api/v1/habits/:id', () => {
  it('parent should update habit name', async () => {
    const res = await request(app)
      .put(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: '每天阅读30分钟' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('每天阅读30分钟');
  });

  it('parent should update habit frequency to weekly', async () => {
    const res = await request(app)
      .put(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ frequency: 'weekly', weekdays: [1, 3, 5] });
    expect(res.status).toBe(200);
    expect(res.body.data.frequency).toBe('weekly');
  });

  it('parent should update habit back to daily', async () => {
    const res = await request(app)
      .put(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ frequency: 'daily' });
    expect(res.status).toBe(200);
    expect(res.body.data.frequency).toBe('daily');
  });

  it('child should not update habit', async () => {
    const res = await request(app)
      .put(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ name: '孩子修改' });
    expect(res.status).toBe(403);
  });
});

// ──── 打卡 ────────────────────────────────────────────────

describe('POST /api/v1/habits/:id/checkin', () => {
  it('child should check in', async () => {
    const res = await request(app)
      .post(`/api/v1/habits/${habitId}/checkin`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.checkedIn).toBe(true);
    expect(typeof res.body.data.rewardStars).toBe('number');
    expect(typeof res.body.data.streak).toBe('number');
  });

  it('should return 409 on duplicate check-in same day', async () => {
    const res = await request(app)
      .post(`/api/v1/habits/${habitId}/checkin`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(409);
  });

  it('parent should not check in', async () => {
    const res = await request(app)
      .post(`/api/v1/habits/${habitId}/checkin`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(403);
  });
});

// ──── 查询今日打卡状态 ────────────────────────────────────────────────

describe('GET /api/v1/habits/:id/checkin/today', () => {
  it('child should get today checkin status as true after checking in', async () => {
    const res = await request(app)
      .get(`/api/v1/habits/${habitId}/checkin/today`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.checkedIn).toBe(true);
  });

  it('parent should get today checkin status', async () => {
    const res = await request(app)
      .get(`/api/v1/habits/${habitId}/checkin/today`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('checkedIn');
  });
});

// ──── 取消打卡 ────────────────────────────────────────────────

describe('DELETE /api/v1/habits/:id/checkin', () => {
  it('child should cancel check-in', async () => {
    const res = await request(app)
      .delete(`/api/v1/habits/${habitId}/checkin`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.checkedIn).toBe(false);
  });

  it('today checkin status should be false after cancel', async () => {
    const res = await request(app)
      .get(`/api/v1/habits/${habitId}/checkin/today`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.checkedIn).toBe(false);
  });

  it('parent should not cancel checkin', async () => {
    const res = await request(app)
      .delete(`/api/v1/habits/${habitId}/checkin`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(403);
  });
});

// ──── 删除习惯 ────────────────────────────────────────────────

describe('DELETE /api/v1/habits/:id', () => {
  it('child should not delete habit', async () => {
    const res = await request(app)
      .delete(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(403);
  });

  it('parent should delete habit', async () => {
    const res = await request(app)
      .delete(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 after deletion', async () => {
    const res = await request(app)
      .get(`/api/v1/habits/${habitId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(404);
  });

  it('habit list should not include deleted habit', async () => {
    const res = await request(app)
      .get(`/api/v1/habits?childId=${childId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as Array<{ id: string }>).map((h) => h.id);
    expect(ids).not.toContain(habitId);
  });
});
