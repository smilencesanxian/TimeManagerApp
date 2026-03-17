import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import * as taskService from '../services/taskService.js';
import * as pomodoroService from '../services/pomodoroService.js';
import { emitTaskCreated, emitTaskStatusChanged, emitTaskDeleted } from '../websocket/manager.js';

const router = Router();

// 所有任务路由都需要认证
router.use(authenticate);

// POST /api/v1/tasks — 创建任务（仅家长）
router.post(
  '/',
  requireRole('parent'),
  [
    body('childId').isString().notEmpty().withMessage('childId 必填'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date 格式应为 YYYY-MM-DD'),
    body('subject').isString().notEmpty().withMessage('subject 必填'),
    body('title').isString().notEmpty().withMessage('title 必填'),
    body('duration').isInt({ min: 1, max: 480 }).withMessage('duration 应为 1-480 的整数（分钟）'),
    body('priority').optional().isInt({ min: 1, max: 3 }).withMessage('priority 应为 1/2/3'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const task = await taskService.createTask(req.user!.userId, {
        childId: req.body.childId,
        date: req.body.date,
        subject: req.body.subject,
        title: req.body.title,
        description: req.body.description,
        duration: req.body.duration,
        priority: req.body.priority,
      });
      // 广播新任务创建事件
      await emitTaskCreated({
        taskId: task.id,
        childId: task.childId,
        title: task.title,
        subject: task.subject,
        date: task.date,
      });
      res.status(201).json({ code: 201, message: '创建成功', data: task });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// GET /api/v1/tasks/today — 今日任务
router.get(
  '/today',
  [query('childId').optional().isString()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const tasks = await taskService.getTodayTasks(
        req.user!.userId,
        req.user!.role,
        req.query['childId'] as string | undefined
      );
      res.json({ code: 200, message: 'success', data: tasks });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// GET /api/v1/tasks — 查询任务列表
router.get(
  '/',
  [
    query('childId').optional().isString(),
    query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query('status').optional().isIn(['todo', 'doing', 'done', 'paused']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const tasks = await taskService.getTasks(req.user!.userId, req.user!.role, {
        childId: req.query['childId'] as string | undefined,
        date: req.query['date'] as string | undefined,
        status: req.query['status'] as string | undefined,
      });
      res.json({ code: 200, message: 'success', data: tasks });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// GET /api/v1/tasks/:id — 获取单个任务
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const task = await taskService.getTaskById(req.user!.userId, req.user!.role, req.params['id'] as string);
      res.json({ code: 200, message: 'success', data: task });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// PUT /api/v1/tasks/:id — 更新任务（仅家长）
router.put(
  '/:id',
  requireRole('parent'),
  [
    param('id').isString().notEmpty(),
    body('subject').optional().isString().notEmpty(),
    body('title').optional().isString().notEmpty(),
    body('duration').optional().isInt({ min: 1, max: 480 }),
    body('priority').optional().isInt({ min: 1, max: 3 }),
    body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const task = await taskService.updateTask(req.user!.userId, req.params['id'] as string, {
        subject: req.body.subject,
        title: req.body.title,
        description: req.body.description,
        duration: req.body.duration,
        priority: req.body.priority,
        date: req.body.date,
      });
      res.json({ code: 200, message: '更新成功', data: task });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// PUT /api/v1/tasks/:id/status — 更新任务状态（家长/孩子均可）
router.put(
  '/:id/status',
  [
    param('id').isString().notEmpty(),
    body('status').isIn(['todo', 'doing', 'done', 'paused']).withMessage('status 无效'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const task = await taskService.updateTaskStatus(
        req.user!.userId,
        req.user!.role,
        req.params['id'] as string,
        req.body.status
      );
      // 广播状态变更事件
      await emitTaskStatusChanged({
        taskId: task.id,
        status: task.status,
        childId: task.childId,
        title: task.title,
        updatedById: req.user!.userId,
      });
      res.json({ code: 200, message: '状态更新成功', data: task });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// DELETE /api/v1/tasks/:id — 删除任务（仅家长）
router.delete(
  '/:id',
  requireRole('parent'),
  [param('id').isString().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const taskToDelete = await taskService.getTaskById(req.user!.userId, req.user!.role, req.params['id'] as string);
      await taskService.deleteTask(req.user!.userId, req.params['id'] as string);
      // 广播任务删除事件
      await emitTaskDeleted({ taskId: taskToDelete.id, childId: taskToDelete.childId });
      res.json({ code: 200, message: '删除成功' });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// ──── 番茄钟 ────────────────────────────────────────────────

// POST /api/v1/tasks/:id/pomodoro/start — 启动番茄钟 session
router.post(
  '/:id/pomodoro/start',
  [
    param('id').isString().notEmpty(),
    body('type').isIn(['focus', 'break']).withMessage('type 必须为 focus 或 break'),
    body('durationMin').optional().isInt({ min: 1, max: 60 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }
    try {
      const session = await pomodoroService.startSession(
        req.user!.userId,
        req.user!.role,
        req.params['id'] as string,
        { type: req.body.type, durationMin: req.body.durationMin }
      );
      res.status(201).json({ code: 201, message: '启动成功', data: session });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// GET /api/v1/tasks/:id/pomodoro/sessions — 查询任务的所有 sessions
router.get(
  '/:id/pomodoro/sessions',
  [
    param('id').isString().notEmpty(),
    query('type').optional().isIn(['focus', 'break']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }
    try {
      const sessions = await pomodoroService.getSessionsByTask(
        req.user!.userId,
        req.user!.role,
        req.params['id'] as string,
        req.query['type'] as string | undefined
      );
      res.json({ code: 200, message: 'success', data: sessions });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// GET /api/v1/tasks/:id/pomodoro/summary — 专注数据汇总
router.get(
  '/:id/pomodoro/summary',
  [param('id').isString().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const summary = await pomodoroService.getSessionSummary(
        req.user!.userId,
        req.user!.role,
        req.params['id'] as string
      );
      res.json({ code: 200, message: 'success', data: summary });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

export default router;
