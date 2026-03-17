import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as achievementService from '../services/achievementService.js';

const router = Router();

// GET /achievements/summary?childId=xxx (parent可查询孩子，孩子只能查自己)
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const childId = req.query['childId'] as string | undefined;
    const targetId = (childId && req.user!.role === 'parent') ? childId : userId;
    const summary = await achievementService.getSummary(targetId);
    res.json({ code: 200, data: summary });
  } catch (err) {
    const e = err as { statusCode?: number; message: string };
    res.status(e.statusCode ?? 500).json({ code: e.statusCode ?? 500, message: e.message });
  }
});

// GET /achievements/history?year=2024&month=1
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const year = parseInt(String(req.query['year'] ?? now.getFullYear()));
    const month = parseInt(String(req.query['month'] ?? now.getMonth() + 1));
    const history = await achievementService.getHistory(userId, year, month);
    res.json({ code: 200, data: history });
  } catch (err) {
    const e = err as { statusCode?: number; message: string };
    res.status(e.statusCode ?? 500).json({ code: e.statusCode ?? 500, message: e.message });
  }
});

// GET /achievements/weekly
router.get('/weekly', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const weekly = await achievementService.getWeeklySummary(userId);
    res.json({ code: 200, data: weekly });
  } catch (err) {
    const e = err as { statusCode?: number; message: string };
    res.status(e.statusCode ?? 500).json({ code: e.statusCode ?? 500, message: e.message });
  }
});

// POST /achievements/debug/set-stars (parent only)
router.post('/debug/set-stars', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'parent') {
      res.status(403).json({ code: 403, message: '仅家长可调用调试接口' });
      return;
    }
    const { childId, stars } = req.body as { childId: string; stars: number };
    await achievementService.debugSetStars(req.user!.userId, childId, stars);
    res.json({ code: 200, message: 'ok' });
  } catch (err) {
    const e = err as { statusCode?: number; message: string };
    res.status(e.statusCode ?? 500).json({ code: e.statusCode ?? 500, message: e.message });
  }
});

// POST /achievements/debug/set-rewards (parent only)
router.post('/debug/set-rewards', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'parent') {
      res.status(403).json({ code: 403, message: '仅家长可调用调试接口' });
      return;
    }
    const { childId, stars, moons, suns } = req.body as {
      childId: string;
      stars: number;
      moons: number;
      suns: number;
    };
    await achievementService.debugSetRewards(req.user!.userId, childId, stars, moons, suns);
    res.json({ code: 200, message: 'ok' });
  } catch (err) {
    const e = err as { statusCode?: number; message: string };
    res.status(e.statusCode ?? 500).json({ code: e.statusCode ?? 500, message: e.message });
  }
});

export default router;
