import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import * as habitService from '../services/habitService.js';

const router = Router();
router.use(authenticate);

// POST /habits — 创建习惯（家长）
router.post(
  '/',
  requireRole('parent'),
  [
    body('childId').isString().notEmpty().withMessage('childId 必填'),
    body('name').isString().notEmpty().withMessage('name 必填'),
    body('icon').optional().isString(),
    body('frequency').optional().isIn(['daily', 'weekly']).withMessage('frequency 应为 daily 或 weekly'),
    body('weekdays').optional().isArray(),
    body('rewardStars').optional().isInt({ min: 1, max: 5 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }
    try {
      const habit = await habitService.createHabit(req.user!.userId, {
        childId: req.body.childId,
        name: req.body.name,
        icon: req.body.icon,
        frequency: req.body.frequency,
        weekdays: req.body.weekdays,
        rewardStars: req.body.rewardStars,
      });
      res.status(201).json({ code: 201, message: '创建成功', data: habit });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// GET /habits — 查询习惯列表
router.get(
  '/',
  [query('childId').optional().isString()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rawChildId = req.query['childId'];
      const childId = typeof rawChildId === 'string' ? rawChildId : undefined;
      const habits = await habitService.getHabits(
        req.user!.userId,
        req.user!.role,
        childId
      );
      res.json({ code: 200, message: 'OK', data: habits });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// GET /habits/:id — 获取单个习惯
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const habit = await habitService.getHabitById(req.params['id'] as string, req.user!.userId, req.user!.role);
      res.json({ code: 200, message: 'OK', data: habit });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// PUT /habits/:id — 更新习惯（家长）
router.put(
  '/:id',
  requireRole('parent'),
  [
    param('id').isString().notEmpty(),
    body('name').optional().isString().notEmpty(),
    body('icon').optional().isString(),
    body('frequency').optional().isIn(['daily', 'weekly']),
    body('weekdays').optional().isArray(),
    body('rewardStars').optional().isInt({ min: 1, max: 5 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }
    try {
      const habit = await habitService.updateHabit(req.params['id'] as string, req.user!.userId, req.body);
      res.json({ code: 200, message: '更新成功', data: habit });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// DELETE /habits/:id — 删除习惯（家长）
router.delete(
  '/:id',
  requireRole('parent'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await habitService.deleteHabit(req.params['id'] as string, req.user!.userId);
      res.json({ code: 200, message: '删除成功' });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// POST /habits/:id/checkin — 打卡（孩子）
router.post(
  '/:id/checkin',
  requireRole('child'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await habitService.checkIn(req.params['id'] as string, req.user!.userId);
      res.json({ code: 200, message: '打卡成功', data: result });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// DELETE /habits/:id/checkin — 取消打卡（孩子）
router.delete(
  '/:id/checkin',
  requireRole('child'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await habitService.cancelCheckIn(req.params['id'] as string, req.user!.userId);
      res.json({ code: 200, message: '取消打卡成功', data: result });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

// GET /habits/:id/checkin/today — 查询今日打卡状态
router.get(
  '/:id/checkin/today',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // child can only check their own, parent can check any of their children
      let childId = req.user!.userId;
      if (req.user!.role === 'parent') {
        // Get the habit and use its childId
        const habit = await habitService.getHabitById(req.params['id'] as string, req.user!.userId, req.user!.role);
        childId = (habit as unknown as { childId: string }).childId;
      }
      const result = await habitService.getTodayCheckin(req.params['id'] as string, childId);
      res.json({ code: 200, message: 'OK', data: result });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

export default router;
