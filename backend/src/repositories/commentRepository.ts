import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createComment(parentId: string, childId: string, content: string) {
  return prisma.parentComment.create({
    data: { parentId, childId, content },
  });
}

export async function getCommentsByChild(childId: string, limit = 20) {
  return prisma.parentComment.findMany({
    where: { childId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function deleteComment(id: string) {
  return prisma.parentComment.delete({ where: { id } });
}
