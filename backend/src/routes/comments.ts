import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { createComment, getCommentsByChild, deleteComment } from '../repositories/commentRepository.js';

const router = Router();

router.use(authenticate);

// POST /api/v1/comments — 家长发送心语
router.post(
  '/',
  requireRole('parent'),
  [
    body('childId').isUUID().withMessage('childId 必须是有效UUID'),
    body('content').isString().trim().notEmpty().withMessage('content 不能为空')
      .isLength({ max: 200 }).withMessage('content 最多200字'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const comment = await createComment(req.user!.userId, req.body.childId as string, req.body.content as string);
      res.status(201).json({ code: 201, message: '发送成功', data: comment });
    } catch (err: unknown) {
      const error = err as { message: string };
      res.status(500).json({ code: 500, message: error.message });
    }
  }
);

// GET /api/v1/comments?childId=xxx — 获取孩子收到的心语（孩子自己或家长）
router.get(
  '/',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const childId = (req.query['childId'] as string) ?? req.user!.userId;
    try {
      const comments = await getCommentsByChild(childId);
      res.json({ code: 200, message: 'OK', data: comments });
    } catch (err: unknown) {
      const error = err as { message: string };
      res.status(500).json({ code: 500, message: error.message });
    }
  }
);

// DELETE /api/v1/comments/:id — 删除心语（仅家长）
router.delete(
  '/:id',
  requireRole('parent'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await deleteComment(req.params['id'] as string);
      res.json({ code: 200, message: '已删除' });
    } catch (err: unknown) {
      const error = err as { message: string };
      res.status(500).json({ code: 500, message: error.message });
    }
  }
);

export default router;
