import 'dotenv/config';
import request from 'supertest';
import { execSync } from 'child_process';
import { createApp } from '../../src/app';

// 使用测试数据库
process.env['DATABASE_URL'] = 'file:./test.db';
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret';

const app = createApp();

beforeAll(() => {
  // 重置测试数据库（清空数据+重建表）
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
});

afterAll(() => {
  // 清理测试数据库
  try {
    execSync('rm -f ./test.db ./test.db-journal ./test.db-wal ./test.db-shm', { stdio: 'pipe' });
  } catch { /* ignore */ }
});

describe('GET /api/v1/health', () => {
  it('should return 200 OK', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });
});

describe('POST /api/v1/auth/register', () => {
  it('should register successfully', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13800000001',
      password: 'password123',
      nickname: '测试家长',
      role: 'parent',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('parent');
  });

  it('should return 400 on invalid phone', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '12345',
      password: 'password123',
      nickname: '测试',
      role: 'parent',
    });
    expect(res.status).toBe(400);
  });

  it('should return 400 on missing role', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13800000002',
      password: 'password123',
      nickname: '测试',
    });
    expect(res.status).toBe(400);
  });

  it('should return 409 on duplicate phone', async () => {
    const phone = '13800000003';
    await request(app).post('/api/v1/auth/register').send({
      phone,
      password: 'password123',
      nickname: '测试',
      role: 'parent',
    });
    const res = await request(app).post('/api/v1/auth/register').send({
      phone,
      password: 'password456',
      nickname: '测试2',
      role: 'child',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/v1/auth/login', () => {
  const phone = '13800000010';

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({
      phone,
      password: 'password123',
      nickname: '登录测试用户',
      role: 'parent',
    });
  });

  it('should login successfully', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      phone,
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('should return 401 on wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      phone,
      password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });

  it('should return 404 on non-existent user', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      phone: '13999999999',
      password: 'password123',
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/auth/wechat-login', () => {
  it('should login with wechat code (mock mode)', async () => {
    const res = await request(app).post('/api/v1/auth/wechat-login').send({
      code: 'test_code_001',
      nickname: '微信用户',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.isNewUser).toBe(true);
  });

  it('should return existing user on second login', async () => {
    const res = await request(app).post('/api/v1/auth/wechat-login').send({
      code: 'test_code_001',
      nickname: '微信用户',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.isNewUser).toBe(false);
  });

  it('should return 400 if code is missing', async () => {
    const res = await request(app).post('/api/v1/auth/wechat-login').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13800000020',
      password: 'password123',
      nickname: '我的用户',
      role: 'child',
    });
    accessToken = res.body.data.accessToken as string;
  });

  it('should return current user info', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('child');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13800000030',
      password: 'password123',
      nickname: '刷新Token用户',
      role: 'parent',
    });
    refreshToken = res.body.data.refreshToken as string;
  });

  it('should refresh access token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('should return 401 on invalid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'invalid' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/v1/auth/role', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '13800000040',
      password: 'password123',
      nickname: '角色切换用户',
      role: 'child',
    });
    accessToken = res.body.data.accessToken as string;
  });

  it('should update user role', async () => {
    const res = await request(app)
      .put('/api/v1/auth/role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'parent' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('parent');
  });
});

describe('POST /api/v1/auth/invite + POST /api/v1/auth/bind + GET /api/v1/auth/children', () => {
  let parentToken: string;
  let childToken: string;
  let inviteCode: string;

  beforeAll(async () => {
    // 注册家长
    const parentRes = await request(app).post('/api/v1/auth/register').send({
      phone: '13800000050',
      password: 'password123',
      nickname: '测试家长50',
      role: 'parent',
    });
    parentToken = parentRes.body.data.accessToken as string;

    // 注册孩子
    const childRes = await request(app).post('/api/v1/auth/register').send({
      phone: '13800000051',
      password: 'password123',
      nickname: '测试孩子51',
      role: 'child',
    });
    childToken = childRes.body.data.accessToken as string;
  });

  it('POST /invite - 家长生成邀请码', async () => {
    const res = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childNickname: '孩子昵称' });
    expect(res.status).toBe(200);
    expect(res.body.data.inviteCode).toBeTruthy();
    inviteCode = res.body.data.inviteCode as string;
  });

  it('POST /bind - 孩子使用邀请码绑定家长', async () => {
    const res = await request(app)
      .post('/api/v1/auth/bind')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ inviteCode });
    expect(res.status).toBe(200);
    expect(res.body.data.parentId).toBeTruthy();
    expect(res.body.data.childId).toBeTruthy();
  });

  it('POST /bind - 邀请码一次性消耗，重复使用应返回 400', async () => {
    // 邀请码绑定后，家庭记录中的临时账户被删除（cascade），邀请码随之失效
    const res = await request(app)
      .post('/api/v1/auth/bind')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ inviteCode });
    expect(res.status).toBe(400);
  });

  it('POST /bind - 无效邀请码应返回 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/bind')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ inviteCode: 'INVALID1' });
    expect(res.status).toBe(400);
  });

  it('GET /children - 家长获取孩子列表，应包含已绑定孩子', async () => {
    const res = await request(app)
      .get('/api/v1/auth/children')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].nickname).toBe('测试孩子51');
  });

  it('GET /children - 孩子调用应返回 403', async () => {
    const res = await request(app)
      .get('/api/v1/auth/children')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /me - 已绑定孩子的 familyId 不为 null', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.familyId).toBeTruthy();
  });

  it('GET /me - 未绑定孩子的 familyId 为 null', async () => {
    // 注册一个新孩子，不做绑定
    const newChild = await request(app).post('/api/v1/auth/register').send({
      phone: '13800000052',
      password: 'password123',
      nickname: '未绑定孩子',
      role: 'child',
    });
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newChild.body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.familyId).toBeNull();
  });
});
