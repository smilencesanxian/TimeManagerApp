// 认证业务逻辑单元测试（Mock数据库）
jest.mock('../../src/repositories/userRepository');

import * as userRepo from '../../src/repositories/userRepository';
import * as authService from '../../src/services/authService';

const mockUserRepo = userRepo as jest.Mocked<typeof userRepo>;

const mockParent = {
  id: 'parent-001',
  openid: null,
  phone: '13800138000',
  passwordHash: '$2a$10$wqbUcb0.AfwPRPsTnNlq/es95ZHkiGOJubA5xY/x/QtO0T7OxcT9q', // "password123"
  nickname: '测试家长',
  avatarUrl: null,
  role: 'parent',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockChild = {
  id: 'child-001',
  openid: 'wx_openid_123',
  phone: null,
  passwordHash: null,
  nickname: '小明',
  avatarUrl: null,
  role: 'child',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authService - registerWithPhone', () => {
  it('should register new user successfully', async () => {
    mockUserRepo.findUserByPhone.mockResolvedValue(null);
    mockUserRepo.createUser.mockResolvedValue(mockParent);
    mockUserRepo.saveRefreshToken.mockResolvedValue({
      id: 'rt-1', userId: 'parent-001', token: 'token', expiresAt: new Date(), createdAt: new Date()
    });

    const result = await authService.registerWithPhone({
      phone: '13800138000',
      password: 'password123',
      nickname: '测试家长',
      role: 'parent',
    });

    expect(result.user.role).toBe('parent');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(mockUserRepo.createUser).toHaveBeenCalledTimes(1);
  });

  it('should throw 409 if phone already registered', async () => {
    mockUserRepo.findUserByPhone.mockResolvedValue(mockParent);

    await expect(
      authService.registerWithPhone({
        phone: '13800138000',
        password: 'password123',
        nickname: '测试家长',
        role: 'parent',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('authService - loginWithPhone', () => {
  it('should login successfully with correct password', async () => {
    mockUserRepo.findUserByPhone.mockResolvedValue(mockParent);
    mockUserRepo.saveRefreshToken.mockResolvedValue({
      id: 'rt-1', userId: 'parent-001', token: 'token', expiresAt: new Date(), createdAt: new Date()
    });

    const result = await authService.loginWithPhone('13800138000', 'password123');
    expect(result.user.id).toBe('parent-001');
    expect(result.accessToken).toBeTruthy();
  });

  it('should throw 404 if user not found', async () => {
    mockUserRepo.findUserByPhone.mockResolvedValue(null);
    await expect(authService.loginWithPhone('13900000000', 'pass')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should throw 401 if password incorrect', async () => {
    mockUserRepo.findUserByPhone.mockResolvedValue(mockParent);
    await expect(authService.loginWithPhone('13800138000', 'wrongpassword')).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('authService - wechatLogin', () => {
  it('should create new user on first login', async () => {
    mockUserRepo.findUserByOpenid.mockResolvedValue(null);
    mockUserRepo.createUser.mockResolvedValue(mockChild);
    mockUserRepo.saveRefreshToken.mockResolvedValue({
      id: 'rt-1', userId: 'child-001', token: 'token', expiresAt: new Date(), createdAt: new Date()
    });

    const result = await authService.wechatLogin('wx_openid_123', '小明');
    expect(result.isNewUser).toBe(true);
    expect(result.user.nickname).toBe('小明');
  });

  it('should return existing user on repeat login', async () => {
    mockUserRepo.findUserByOpenid.mockResolvedValue(mockChild);
    mockUserRepo.saveRefreshToken.mockResolvedValue({
      id: 'rt-1', userId: 'child-001', token: 'token', expiresAt: new Date(), createdAt: new Date()
    });

    const result = await authService.wechatLogin('wx_openid_123', '小明');
    expect(result.isNewUser).toBe(false);
    expect(mockUserRepo.createUser).not.toHaveBeenCalled();
  });
});

describe('authService - refreshAccessToken', () => {
  it('should throw 401 if refresh token not found', async () => {
    mockUserRepo.findRefreshToken.mockResolvedValue(null);
    await expect(authService.refreshAccessToken('invalid-token')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('should throw 401 if refresh token expired', async () => {
    mockUserRepo.findRefreshToken.mockResolvedValue({
      id: 'rt-1', userId: 'parent-001', token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000), createdAt: new Date()
    });
    mockUserRepo.deleteRefreshToken.mockResolvedValue({
      id: 'rt-1', userId: 'parent-001', token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000), createdAt: new Date()
    });

    await expect(authService.refreshAccessToken('expired-token')).rejects.toMatchObject({ statusCode: 401 });
  });
});
