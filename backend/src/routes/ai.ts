import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { parseTask, suggestComments } from '../services/aiService.js';

const router = Router();

router.use(authenticate);

// POST /api/v1/ai/parse-task — AI 解析任务描述（仅家长）
router.post(
  '/parse-task',
  requireRole('parent'),
  [
    body('description')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('description 不能为空')
      .isLength({ max: 200 })
      .withMessage('description 最多200字'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const result = await parseTask(req.body.description as string);
      res.json({ code: 200, message: '解析成功', data: result });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message: string };
      res.status(error.statusCode ?? 500).json({
        code: error.statusCode ?? 500,
        message: error.message,
      });
    }
  }
);

// POST /api/v1/ai/suggest-comments — AI 推荐评语（仅家长）
router.post(
  '/suggest-comments',
  requireRole('parent'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { childName, taskInfo } = req.body as { childName?: string; taskInfo?: string };
    const suggestions = await suggestComments(childName ?? '孩子', taskInfo);
    res.json({ code: 200, message: 'OK', data: suggestions });
  }
);

export default router;
