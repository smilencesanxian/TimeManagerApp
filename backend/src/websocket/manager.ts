import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import * as userRepo from '../repositories/userRepository.js';
import logger from '../utils/logger.js';

let io: SocketServer | null = null;

export interface TaskUpdatePayload {
  taskId: string;
  status: string;
  childId: string;
  title: string;
  updatedById: string;
}

export interface TaskCreatedPayload {
  taskId: string;
  childId: string;
  title: string;
  subject: string;
  date: string;
}

export interface TaskDeletedPayload {
  taskId: string;
  childId: string;
}

export function initWebSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/ws',
  });

  // JWT 认证中间件
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth['token'] as string | undefined;
      if (!token) {
        return next(new Error('未提供认证Token'));
      }
      const payload = verifyToken(token);
      socket.data['userId'] = payload.userId;
      socket.data['role'] = payload.role;
      next();
    } catch {
      next(new Error('Token无效或已过期'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data['userId'] as string;
    const role = socket.data['role'] as string;

    // 每个用户加入自己的个人房间
    await socket.join(`user:${userId}`);

    // 根据角色加入家庭房间
    if (role === 'parent') {
      const children = await userRepo.findChildrenByParentId(userId);
      for (const f of children) {
        await socket.join(`family:${userId}`);
        await socket.join(`user:${f.childId}`); // 也监听孩子房间（可选）
      }
      await socket.join(`family:${userId}`);
    } else if (role === 'child') {
      const parents = await userRepo.findParentsByChildId(userId);
      for (const f of parents) {
        await socket.join(`family:${f.parentId}`);
      }
    }

    logger.info(`WebSocket connected: ${userId} (${role})`);

    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected: ${userId}`);
    });
  });

  logger.info('WebSocket 服务已初始化');
  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

// 广播任务状态变更（通知孩子所在的家庭房间）
export async function emitTaskStatusChanged(payload: TaskUpdatePayload): Promise<void> {
  if (!io) return;
  const parents = await userRepo.findParentsByChildId(payload.childId);
  // 通知孩子本人
  io.to(`user:${payload.childId}`).emit('task:status_changed', payload);
  // 通知所有关联家长
  for (const f of parents) {
    io.to(`family:${f.parentId}`).emit('task:status_changed', payload);
  }
}

// 广播新任务创建（通知孩子）
export async function emitTaskCreated(payload: TaskCreatedPayload): Promise<void> {
  if (!io) return;
  io.to(`user:${payload.childId}`).emit('task:created', payload);
}

// 广播任务删除（通知孩子）
export async function emitTaskDeleted(payload: TaskDeletedPayload): Promise<void> {
  if (!io) return;
  io.to(`user:${payload.childId}`).emit('task:deleted', payload);
}
