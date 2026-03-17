import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as userRepo from '../repositories/userRepository.js';
import { generateTokenPair, verifyToken } from '../utils/jwt.js';
import { createError } from '../middleware/errorHandler.js';

interface WechatLoginResult {
  user: { id: string; nickname: string; role: string; avatarUrl: string | null };
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

interface PhoneRegisterParams {
  phone: string;
  password: string;
  nickname: string;
  role: 'parent' | 'child';
}

// 微信登录（code换openid，此处为Mock或真实调用）
export async function wechatLogin(
  openid: string,
  nickname: string,
  avatarUrl?: string
): Promise<WechatLoginResult> {
  let user = await userRepo.findUserByOpenid(openid);
  let isNewUser = false;

  if (!user) {
    user = await userRepo.createUser({
      openid,
      nickname,
      avatarUrl,
      role: 'child', // 默认角色，后续可修改
    });
    isNewUser = true;
  }

  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await userRepo.saveRefreshToken(user.id, tokens.refreshToken, expiresAt);

  return {
    user: { id: user.id, nickname: user.nickname, role: user.role, avatarUrl: user.avatarUrl },
    ...tokens,
    isNewUser,
  };
}

// 手机号注册（开发测试用）
export async function registerWithPhone(params: PhoneRegisterParams) {
  const { phone, password, nickname, role } = params;

  const existing = await userRepo.findUserByPhone(phone);
  if (existing) {
    throw createError('手机号已注册', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepo.createUser({ phone, passwordHash, nickname, role });

  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await userRepo.saveRefreshToken(user.id, tokens.refreshToken, expiresAt);

  return {
    user: { id: user.id, nickname: user.nickname, role: user.role, avatarUrl: user.avatarUrl },
    ...tokens,
  };
}

// 手机号登录
export async function loginWithPhone(phone: string, password: string) {
  const user = await userRepo.findUserByPhone(phone);
  if (!user) {
    throw createError('用户不存在', 404);
  }
  if (!user.passwordHash) {
    throw createError('该账户未设置密码', 400);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw createError('密码错误', 401);
  }

  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await userRepo.saveRefreshToken(user.id, tokens.refreshToken, expiresAt);

  return {
    user: { id: user.id, nickname: user.nickname, role: user.role, avatarUrl: user.avatarUrl },
    ...tokens,
  };
}

// 刷新Token
export async function refreshAccessToken(refreshToken: string) {
  const stored = await userRepo.findRefreshToken(refreshToken);
  if (!stored) {
    throw createError('无效的刷新Token', 401);
  }
  if (stored.expiresAt < new Date()) {
    await userRepo.deleteRefreshToken(refreshToken);
    throw createError('刷新Token已过期', 401);
  }

  const payload = verifyToken(refreshToken);
  const user = await userRepo.findUserById(payload.userId);
  if (!user) {
    throw createError('用户不存在', 404);
  }

  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  await userRepo.deleteRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await userRepo.saveRefreshToken(user.id, tokens.refreshToken, expiresAt);

  return tokens;
}

// 登出
export async function logout(refreshToken: string) {
  try {
    await userRepo.deleteRefreshToken(refreshToken);
  } catch {
    // 忽略不存在的token
  }
}

// 更新用户角色
export async function updateUserRole(userId: string, role: 'parent' | 'child') {
  const user = await userRepo.updateUser(userId, { role });
  return { id: user.id, nickname: user.nickname, role: user.role };
}

// 生成邀请码（家长邀请孩子）
export async function generateInviteCode(parentId: string, childNickname: string) {
  const parent = await userRepo.findUserById(parentId);
  if (!parent || parent.role !== 'parent') {
    throw createError('只有家长才能生成邀请码', 403);
  }

  // 创建临时孩子账户
  const tempChild = await userRepo.createUser({
    nickname: childNickname,
    role: 'child',
  });

  const inviteCode = uuidv4().slice(0, 8).toUpperCase();
  await userRepo.createFamily(parentId, tempChild.id, inviteCode);

  return { inviteCode, childId: tempChild.id };
}

// 家长获取已绑定的孩子列表
export async function getMyChildren(parentId: string) {
  const parent = await userRepo.findUserById(parentId);
  if (!parent || parent.role !== 'parent') {
    throw createError('只有家长才能查询孩子列表', 403);
  }
  const families = await userRepo.findChildrenByParentId(parentId);
  return families
    .filter(f => f.child.phone || f.child.openid) // 过滤掉未绑定的临时账户
    .map(f => ({
      id: f.child.id,
      nickname: f.child.nickname,
      avatarUrl: f.child.avatarUrl,
    }));
}

// 孩子使用邀请码绑定
export async function bindWithInviteCode(childUserId: string, inviteCode: string) {
  const family = await userRepo.findFamilyByInviteCode(inviteCode);
  if (!family) {
    throw createError('邀请码无效', 400);
  }

  // 检查是否已绑定
  const existing = await userRepo.findFamilyByParentAndChild(family.parentId, childUserId);
  if (existing) {
    throw createError('已经绑定过该家长', 409);
  }

  const tempChildId = family.childId;

  // 将邀请码对应的临时家庭记录更新为真实孩子
  await userRepo.updateFamilyChildId(family.id, childUserId);

  // 删除临时孩子账户（如果是系统自动生成的，没有 phone/openid）
  try {
    const tempChild = await userRepo.findUserById(tempChildId);
    if (tempChild && !tempChild.phone && !tempChild.openid) {
      await userRepo.deleteUserById(tempChildId);
    }
  } catch { /* 临时账户删除失败不影响主流程 */ }

  return { parentId: family.parentId, childId: childUserId };
}
