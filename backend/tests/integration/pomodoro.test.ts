import 'dotenv/config';
import request from 'supertest';
import { execSync } from 'child_process';
import { createApp } from '../../src/app';

process.env['DATABASE_URL'] = 'file:./test-pomodoro.db';
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret';

const app = createApp();

let parentToken: string;
let childToken: string;
let otherChildToken: string;
let taskId: string;
let sessionId: string;

beforeAll(() => {
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: 'file:./test-pomodoro.db' },
    stdio: 'pipe',
  });
});

afterAll(() => {
  try {
    execSync('rm -f ./test-pomodoro.db ./test-pomodoro.db-journal ./test-pomodoro.db-wal ./test-pomodoro.db-shm', {
      stdio: 'pipe',
    });
  } catch { /* ignore */ }
});

// ──── 准备账号 ────────────────────────────────────────────────

describe('Setup: accounts and task', () => {
  it('registers parent', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900001001', password: 'password123', nickname: '番茄家长', role: 'parent',
    });
    expect(res.status).toBe(201);
    parentToken = res.body.data.accessToken;
  });

  it('registers child', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900001002', password: 'password123', nickname: '番茄孩子', role: 'child',
    });
    expect(res.status).toBe(201);
    childToken = res.body.data.accessToken;
  });

  it('registers another child (for permission tests)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900001003', password: 'password123', nickname: '其他孩子', role: 'child',
    });
    expect(res.status).toBe(201);
    otherChildToken = res.body.data.accessToken;
  });

  it('parent binds child', async () => {
    const inviteRes = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childNickname: '番茄孩子' });
    expect(inviteRes.status).toBe(200);
    const inviteCode = inviteRes.body.data.inviteCode;

    const bindRes = await request(app)
      .post('/api/v1/auth/bind')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ inviteCode });
    expect(bindRes.status).toBe(200);
  });

  it('parent creates task for child', async () => {
    const childInfo = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${childToken}`);
    const childId = childInfo.body.data.id;

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        title: '数学练习',
        subject: '数学',
        duration: 30,
        childId,
        date: new Date().toISOString().slice(0, 10),
      });
    expect(res.status).toBe(201);
    taskId = res.body.data.id;
  });
});

// ──── 番茄钟会话 CRUD ────────────────────────────────────────

describe('POST /api/v1/tasks/:id/pomodoro/start — 启动番茄钟', () => {
  it('孩子可以为自己的任务启动 focus session', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/pomodoro/start`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ type: 'focus', durationMin: 25 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      taskId,
      type: 'focus',
      durationMin: 25,
      completed: false,
    });
    expect(res.body.data.startedAt).toBeDefined();
    expect(res.body.data.endedAt).toBeNull();
    sessionId = res.body.data.id;
  });

  it('未登录用户返回 401', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/pomodoro/start`)
      .send({ type: 'focus', durationMin: 25 });
    expect(res.status).toBe(401);
  });

  it('其他孩子操作别人的任务返回 403', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/pomodoro/start`)
      .set('Authorization', `Bearer ${otherChildToken}`)
      .send({ type: 'focus', durationMin: 25 });
    expect(res.status).toBe(403);
  });

  it('任务不存在返回 404', async () => {
    const res = await request(app)
      .post('/api/v1/tasks/non-existent-id/pomodoro/start')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ type: 'focus', durationMin: 25 });
    expect(res.status).toBe(404);
  });

  it('缺少 type 字段返回 400', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/pomodoro/start`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ durationMin: 25 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/pomodoro/sessions/:id/end — 结束番茄钟', () => {
  it('孩子可以结束自己的 session', async () => {
    const res = await request(app)
      .post(`/api/v1/pomodoro/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: sessionId,
      completed: true,
    });
    expect(res.body.data.endedAt).toBeDefined();
  });

  it('结束已结束的 session 返回 409', async () => {
    const res = await request(app)
      .post(`/api/v1/pomodoro/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ completed: true });
    expect(res.status).toBe(409);
  });

  it('其他孩子不能结束别人的 session 返回 403', async () => {
    // 先创建新 session
    const startRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/pomodoro/start`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ type: 'focus', durationMin: 25 });
    const newSessionId = startRes.body.data.id;

    const res = await request(app)
      .post(`/api/v1/pomodoro/sessions/${newSessionId}/end`)
      .set('Authorization', `Bearer ${otherChildToken}`)
      .send({ completed: true });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/tasks/:id/pomodoro/start — 启动 break session', () => {
  it('孩子可以启动 break session（5分钟）', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/pomodoro/start`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ type: 'break', durationMin: 5 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      type: 'break',
      durationMin: 5,
      completed: false,
    });
  });
});

describe('GET /api/v1/tasks/:id/pomodoro/sessions — 查询 sessions', () => {
  it('孩子可以查询自己任务的所有 sessions', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/pomodoro/sessions`)
      .set('Authorization', `Bearer ${childToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('家长可以查询孩子任务的 sessions', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/pomodoro/sessions`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
  });

  it('其他孩子查询返回 403', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/pomodoro/sessions`)
      .set('Authorization', `Bearer ${otherChildToken}`);
    expect(res.status).toBe(403);
  });

  it('可以按 type 过滤 sessions', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/pomodoro/sessions?type=focus`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((s: { type: string }) => s.type === 'focus')).toBe(true);
  });
});

describe('GET /api/v1/tasks/:id/pomodoro/summary — 任务专注统计', () => {
  it('返回任务的专注时长汇总', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/pomodoro/summary`)
      .set('Authorization', `Bearer ${childToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      taskId,
      totalFocusMin: expect.any(Number),
      totalBreakMin: expect.any(Number),
      completedPomodoros: expect.any(Number),
      sessions: expect.any(Array),
    });
  });
});
