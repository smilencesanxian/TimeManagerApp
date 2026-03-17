import * as taskRepo from '../repositories/taskRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import * as achievementService from './achievementService.js';
import { createError } from '../middleware/errorHandler.js';
import { Task } from '@prisma/client';

const VALID_SUBJECTS = ['语文', '数学', '英语', '阅读', '运动', '其他'];
const VALID_STATUSES = ['todo', 'doing', 'done', 'paused'];

// 验证家长对孩子是否有管理权限
async function assertParentHasChild(parentId: string, childId: string): Promise<void> {
  const children = await userRepo.findChildrenByParentId(parentId);
  const hasChild = children.some((f) => f.childId === childId);
  if (!hasChild) {
    throw createError('无权操作该孩子的任务', 403);
  }
}

export interface CreateTaskParams {
  childId: string;
  date: string;
  subject: string;
  title: string;
  description?: string;
  duration: number;
  priority?: number;
}

export async function createTask(creatorId: string, params: CreateTaskParams): Promise<Task> {
  await assertParentHasChild(creatorId, params.childId);

  if (!VALID_SUBJECTS.includes(params.subject)) {
    throw createError(`科目无效，可选值: ${VALID_SUBJECTS.join(', ')}`, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    throw createError('日期格式错误，应为 YYYY-MM-DD', 400);
  }
  if (params.duration <= 0 || params.duration > 480) {
    throw createError('时长应在 1-480 分钟之间', 400);
  }

  return taskRepo.createTask({
    ...params,
    createdById: creatorId,
    priority: params.priority ?? 2,
  });
}

export async function getTasks(
  userId: string,
  role: string,
  filter: { childId?: string; date?: string; status?: string }
): Promise<Task[]> {
  if (role === 'child') {
    // 孩子只能查自己的任务
    return taskRepo.findTasks({ ...filter, childId: userId });
  }

  // 家长必须指定 childId 且有权访问
  if (!filter.childId) {
    throw createError('家长查询任务需提供 childId', 400);
  }
  await assertParentHasChild(userId, filter.childId);
  return taskRepo.findTasks(filter);
}

export async function getTodayTasks(userId: string, role: string, childId?: string): Promise<Task[]> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return getTasks(userId, role, { childId, date: today });
}

export async function getTaskById(userId: string, role: string, taskId: string): Promise<Task> {
  const task = await taskRepo.findTaskById(taskId);
  if (!task) throw createError('任务不存在', 404);

  if (role === 'child' && task.childId !== userId) {
    throw createError('无权查看该任务', 403);
  }
  if (role === 'parent') {
    await assertParentHasChild(userId, task.childId);
  }
  return task;
}

export interface UpdateTaskParams {
  subject?: string;
  title?: string;
  description?: string;
  duration?: number;
  priority?: number;
  date?: string;
}

export async function updateTask(
  parentId: string,
  taskId: string,
  params: UpdateTaskParams
): Promise<Task> {
  const task = await taskRepo.findTaskById(taskId);
  if (!task) throw createError('任务不存在', 404);

  await assertParentHasChild(parentId, task.childId);

  if (params.subject && !VALID_SUBJECTS.includes(params.subject)) {
    throw createError(`科目无效，可选值: ${VALID_SUBJECTS.join(', ')}`, 400);
  }
  if (params.date && !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    throw createError('日期格式错误，应为 YYYY-MM-DD', 400);
  }
  if (params.duration !== undefined && (params.duration <= 0 || params.duration > 480)) {
    throw createError('时长应在 1-480 分钟之间', 400);
  }

  return taskRepo.updateTask(taskId, params);
}

export async function updateTaskStatus(
  userId: string,
  role: string,
  taskId: string,
  status: string
): Promise<Task> {
  if (!VALID_STATUSES.includes(status)) {
    throw createError(`状态无效，可选值: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const task = await taskRepo.findTaskById(taskId);
  if (!task) throw createError('任务不存在', 404);

  if (role === 'child' && task.childId !== userId) {
    throw createError('无权操作该任务', 403);
  }
  if (role === 'parent') {
    await assertParentHasChild(userId, task.childId);
  }

  const wasAlreadyDone = task.status === 'done';
  const completedAt = status === 'done' ? new Date() : status === 'todo' ? null : undefined;
  const updated = await taskRepo.updateTaskStatus(taskId, status, completedAt);

  // Award 1 star for first-time task completion
  if (status === 'done' && !wasAlreadyDone) {
    const childUserId = task.childId;
    await achievementService.awardStars(childUserId, 1);
  }

  return updated;
}

export async function deleteTask(parentId: string, taskId: string): Promise<void> {
  const task = await taskRepo.findTaskById(taskId);
  if (!task) throw createError('任务不存在', 404);

  await assertParentHasChild(parentId, task.childId);
  await taskRepo.deleteTask(taskId);
}
