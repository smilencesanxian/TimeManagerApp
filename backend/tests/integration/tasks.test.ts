import 'dotenv/config';
import request from 'supertest';
import { execSync } from 'child_process';
import { createApp } from '../../src/app';

process.env['DATABASE_URL'] = 'file:./test-tasks.db';
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret';

const app = createApp();

let parentToken: string;
let childToken: string;
let childId: string;
let taskId: string;
const today = new Date().toISOString().slice(0, 10);

beforeAll(() => {
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: 'file:./test-tasks.db' },
    stdio: 'pipe',
  });
});

afterAll(() => {
  try {
    execSync('rm -f ./test-tasks.db ./test-tasks.db-journal ./test-tasks.db-wal ./test-tasks.db-shm', {
      stdio: 'pipe',
    });
  } catch { /* ignore */ }
});

// ──── 准备账号 ────────────────────────────────────────────────

describe('Setup: create parent & child, bind family', () => {
  it('should register parent', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900000010',
      password: 'password123',
      nickname: '测试家长',
      role: 'parent',
    });
    expect(res.status).toBe(201);
    parentToken = res.body.data.accessToken;
  });

  it('should register child', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900000011',
      password: 'password123',
      nickname: '测试孩子',
      role: 'child',
    });
    expect(res.status).toBe(201);
    childToken = res.body.data.accessToken;
    childId = res.body.data.user.id;
  });

  it('should bind parent and child', async () => {
    // 家长生成邀请码
    const inviteRes = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childNickname: '测试孩子' });
    expect(inviteRes.status).toBe(200);
    const inviteCode = inviteRes.body.data.inviteCode;

    // 孩子绑定
    const bindRes = await request(app)
      .post('/api/v1/auth/bind')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ inviteCode });
    expect(bindRes.status).toBe(200);
  });
});

// ──── 创建任务 ────────────────────────────────────────────────

describe('POST /api/v1/tasks', () => {
  it('should create task as parent', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        date: today,
        subject: '数学',
        title: '完成数学作业',
        description: '做第10页习题',
        duration: 30,
        priority: 1,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('完成数学作业');
    expect(res.body.data.status).toBe('todo');
    taskId = res.body.data.id;
  });

  it('should return 403 when child tries to create task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ childId, date: today, subject: '数学', title: 'test', duration: 30 });
    expect(res.status).toBe(403);
  });

  it('should return 400 on invalid subject', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, date: today, subject: '体育', title: 'test', duration: 30 });
    expect(res.status).toBe(400);
  });

  it('should return 400 on invalid date format', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, date: '2024/01/01', subject: '数学', title: 'test', duration: 30 });
    expect(res.status).toBe(400);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).post('/api/v1/tasks').send({
      childId, date: today, subject: '数学', title: 'test', duration: 30,
    });
    expect(res.status).toBe(401);
  });
});

// ──── 查询任务 ────────────────────────────────────────────────

describe('GET /api/v1/tasks', () => {
  it('parent should get tasks by childId', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks?childId=${childId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('child should get own tasks (no childId param needed)', async () => {
    const res = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('parent without childId should return 400', async () => {
    const res = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/tasks/today', () => {
  it('child should get today tasks', async () => {
    const res = await request(app)
      .get('/api/v1/tasks/today')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { date: string }) => t.date === today)).toBe(true);
  });

  it('parent should get today tasks for child', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/today?childId=${childId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/tasks/:id', () => {
  it('parent should get task by id', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(taskId);
  });

  it('child should get own task by id', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent task', async () => {
    const res = await request(app)
      .get('/api/v1/tasks/non-existent-id')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(404);
  });
});

// ──── 更新任务 ────────────────────────────────────────────────

describe('PUT /api/v1/tasks/:id', () => {
  it('parent should update task', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: '完成数学作业（已更新）', duration: 45 });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('完成数学作业（已更新）');
    expect(res.body.data.duration).toBe(45);
  });

  it('child should not update task fields', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ title: '孩子修改' });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/v1/tasks/:id/status', () => {
  it('child should update task status to doing', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ status: 'doing' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('doing');
  });

  it('child should update task status to done', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('done');
    expect(res.body.data.completedAt).toBeTruthy();
  });

  it('parent should also be able to update task status', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ status: 'todo' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('todo');
  });

  it('should return 400 on invalid status', async () => {
    const res = await request(app)
      .put(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });
});

// ──── 删除任务 ────────────────────────────────────────────────

describe('DELETE /api/v1/tasks/:id', () => {
  it('child should not delete task', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(403);
  });

  it('parent should delete task', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 after deletion', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(404);
  });
});
