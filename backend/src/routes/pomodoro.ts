import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as pomodoroService from '../services/pomodoroService.js';

const router = Router();

// POST /api/v1/pomodoro/sessions/:id/end — 结束 session
router.post(
  '/sessions/:id/end',
  authenticate,
  [
    param('id').isString().notEmpty(),
    body('completed').isBoolean().withMessage('completed 必须为布尔值'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }
    try {
      const session = await pomodoroService.endSession(
        req.user!.userId,
        req.user!.role,
        req.params['id'] as string,
        req.body.completed
      );
      res.json({ code: 200, message: '结束成功', data: session });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({ code: error.statusCode ?? 500, message: error.message });
    }
  }
);

export default router;
