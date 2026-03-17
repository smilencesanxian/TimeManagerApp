import { PrismaClient, Task } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTaskData {
  childId: string;
  createdById: string;
  date: string; // YYYY-MM-DD
  subject: string;
  title: string;
  description?: string;
  duration: number;
  priority?: number;
}

export interface UpdateTaskData {
  subject?: string;
  title?: string;
  description?: string;
  duration?: number;
  priority?: number;
  date?: string;
}

export interface TaskFilter {
  childId?: string;
  date?: string;
  status?: string;
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  return prisma.task.create({ data });
}

export async function findTaskById(id: string): Promise<Task | null> {
  return prisma.task.findUnique({ where: { id } });
}

export async function findTasks(filter: TaskFilter): Promise<Task[]> {
  return prisma.task.findMany({
    where: {
      ...(filter.childId && { childId: filter.childId }),
      ...(filter.date && { date: filter.date }),
      ...(filter.status && { status: filter.status }),
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function updateTask(id: string, data: UpdateTaskData): Promise<Task> {
  return prisma.task.update({ where: { id }, data });
}

export async function updateTaskStatus(
  id: string,
  status: string,
  completedAt?: Date | null
): Promise<Task> {
  return prisma.task.update({
    where: { id },
    data: {
      status,
      ...(completedAt !== undefined && { completedAt }),
    },
  });
}

export async function deleteTask(id: string): Promise<Task> {
  return prisma.task.delete({ where: { id } });
}
