import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateUserData {
  openid?: string;
  phone?: string;
  passwordHash?: string;
  nickname: string;
  avatarUrl?: string;
  role: string;
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByOpenid(openid: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { openid } });
}

export async function findUserByPhone(phone: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { phone } });
}

export async function createUser(data: CreateUserData): Promise<User> {
  return prisma.user.create({ data });
}

export async function updateUser(id: string, data: Partial<CreateUserData>): Promise<User> {
  return prisma.user.update({ where: { id }, data });
}

export async function createFamily(parentId: string, childId: string, inviteCode?: string) {
  return prisma.family.create({
    data: { parentId, childId, inviteCode },
  });
}

export async function findFamilyByInviteCode(inviteCode: string) {
  return prisma.family.findUnique({ where: { inviteCode } });
}

export async function findChildrenByParentId(parentId: string) {
  return prisma.family.findMany({
    where: { parentId },
    include: { child: true },
  });
}

export async function findParentsByChildId(childId: string) {
  return prisma.family.findMany({
    where: { childId },
    include: { parent: true },
  });
}

export async function saveRefreshToken(userId: string, token: string, expiresAt: Date) {
  return prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
}

export async function findRefreshToken(token: string) {
  return prisma.refreshToken.findUnique({ where: { token } });
}

export async function deleteRefreshToken(token: string) {
  return prisma.refreshToken.delete({ where: { token } });
}

export async function deleteUserRefreshTokens(userId: string) {
  return prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function updateFamilyChildId(familyId: string, newChildId: string) {
  return prisma.family.update({
    where: { id: familyId },
    data: { childId: newChildId, inviteCode: null },
  });
}

export async function deleteFamilyById(familyId: string) {
  return prisma.family.delete({ where: { id: familyId } });
}

export async function deleteUserById(userId: string) {
  return prisma.user.delete({ where: { id: userId } });
}

export async function findFamilyByParentAndChild(parentId: string, childId: string) {
  return prisma.family.findUnique({ where: { parentId_childId: { parentId, childId } } });
}

export async function findLatestInviteByParentId(parentId: string) {
  return prisma.family.findFirst({
    where: { parentId, inviteCode: { not: null } },
    orderBy: { createdAt: 'desc' },
  });
}
