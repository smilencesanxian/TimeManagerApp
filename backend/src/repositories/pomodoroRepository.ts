import { PrismaClient, PomodoroSession } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateSessionParams {
  taskId: string;
  userId: string;
  type: 'focus' | 'break';
  durationMin: number;
}

export async function createSession(params: CreateSessionParams): Promise<PomodoroSession> {
  return prisma.pomodoroSession.create({
    data: {
      taskId: params.taskId,
      userId: params.userId,
      type: params.type,
      durationMin: params.durationMin,
      startedAt: new Date(),
    },
  });
}

export async function findSessionById(id: string): Promise<PomodoroSession | null> {
  return prisma.pomodoroSession.findUnique({ where: { id } });
}

export async function endSession(id: string, completed: boolean): Promise<PomodoroSession> {
  return prisma.pomodoroSession.update({
    where: { id },
    data: { endedAt: new Date(), completed },
  });
}

export async function findSessionsByTaskId(
  taskId: string,
  type?: string
): Promise<PomodoroSession[]> {
  return prisma.pomodoroSession.findMany({
    where: {
      taskId,
      ...(type ? { type } : {}),
    },
    orderBy: { startedAt: 'asc' },
  });
}
