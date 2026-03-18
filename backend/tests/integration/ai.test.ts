import 'dotenv/config';
import request from 'supertest';
import { execSync } from 'child_process';
import { createApp } from '../../src/app.js';

process.env['DATABASE_URL'] = 'file:./test-ai.db';
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret';

const app = createApp();

let parentToken: string;
let childToken: string;

beforeAll(() => {
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: 'file:./test-ai.db' },
    stdio: 'pipe',
  });
});

afterAll(() => {
  jest.restoreAllMocks();
  try {
    execSync('rm -f ./test-ai.db ./test-ai.db-journal ./test-ai.db-wal ./test-ai.db-shm', {
      stdio: 'pipe',
    });
  } catch { /* ignore */ }
});

describe('Setup: create parent & child', () => {
  it('should register parent', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900009901',
      password: 'password123',
      nickname: 'AI测试家长',
      role: 'parent',
    });
    expect(res.status).toBe(201);
    parentToken = res.body.data.accessToken;
  });

  it('should register child', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13900009902',
      password: 'password123',
      nickname: 'AI测试孩子',
      role: 'child',
    });
    expect(res.status).toBe(201);
    childToken = res.body.data.accessToken;
  });
});

describe('POST /api/v1/ai/parse-task', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    // Mock fetch to avoid real API calls in tests
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({ subject: '数学', title: '数学口算', duration: 30, priority: 2 }),
          },
        }],
      }),
    } as Response);
  });

  it('未认证时返回 401', async () => {
    const res = await request(app)
      .post('/api/v1/ai/parse-task')
      .send({ description: '做30分钟数学口算' });
    expect(res.status).toBe(401);
  });

  it('孩子角色无权访问，返回 403', async () => {
    const res = await request(app)
      .post('/api/v1/ai/parse-task')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ description: '做30分钟数学口算' });
    expect(res.status).toBe(403);
  });

  it('缺少 description 时返回 400', async () => {
    const res = await request(app)
      .post('/api/v1/ai/parse-task')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('description 为空字符串时返回 400', async () => {
    const res = await request(app)
      .post('/api/v1/ai/parse-task')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ description: '   ' });
    expect(res.status).toBe(400);
  });

  it('成功解析任务描述（AI mock）', async () => {
    const res = await request(app)
      .post('/api/v1/ai/parse-task')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ description: '做30分钟数学口算' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toMatchObject({
      subject: '数学',
      title: expect.any(String),
      duration: expect.any(Number),
      priority: expect.any(Number),
    });
    expect(res.body.data.title.length).toBeGreaterThan(0);
    expect(res.body.data.duration).toBeGreaterThanOrEqual(1);
    expect(res.body.data.duration).toBeLessThanOrEqual(480);
    expect([1, 2, 3]).toContain(res.body.data.priority);
  });

  it('AI 调用失败时降级规则解析，仍返回 200', async () => {
    jest.restoreAllMocks();
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'));

    const res = await request(app)
      .post('/api/v1/ai/parse-task')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ description: '英语单词背诵20分钟' });

    expect(res.status).toBe(200);
    expect(res.body.data.subject).toBe('英语');
    expect(res.body.data.duration).toBe(20);
  });

  it('description 超过200字返回 400', async () => {
    const longDesc = '数学作业'.repeat(60);
    const res = await request(app)
      .post('/api/v1/ai/parse-task')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ description: longDesc });
    expect(res.status).toBe(400);
  });
});
