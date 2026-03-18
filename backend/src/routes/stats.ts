import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/stats/weekly?startDate=YYYY-MM-DD&childId=xxx
 * 返回指定周的学习统计（家长视角）
 */
router.get('/weekly', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const childIdParam = req.query['childId'] as string | undefined;
    const startDateParam = req.query['startDate'] as string | undefined;

    // Determine target child
    let targetChildId: string | undefined;
    if (role === 'parent' && childIdParam) {
      targetChildId = childIdParam;
    } else if (role === 'parent') {
      // Get first child
      const family = await prisma.family.findFirst({
        where: { parentId: userId },
        include: { child: true },
      });
      if (family) targetChildId = family.childId;
    } else {
      targetChildId = userId;
    }

    if (!targetChildId) {
      res.json({ code: 200, data: { focusDuration: 0, taskTotal: 0, taskDone: 0, habitCheckIns: 0 } });
      return;
    }

    // Compute week range
    const now = new Date();
    const start = startDateParam ? new Date(startDateParam + 'T00:00:00Z') : (() => {
      const d = new Date(now);
      const dow = d.getUTCDay();
      const daysBack = dow === 0 ? 6 : dow - 1;
      d.setUTCDate(d.getUTCDate() - daysBack);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    })();
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    // Task stats
    const [allTasks, doneTasks] = await Promise.all([
      prisma.task.count({ where: { childId: targetChildId, date: { gte: startStr, lt: endStr } } }),
      prisma.task.count({ where: { childId: targetChildId, date: { gte: startStr, lt: endStr }, status: 'done' } }),
    ]);

    // Pomodoro focus duration
    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: targetChildId,
        type: 'focus',
        completed: true,
        startedAt: { gte: start, lt: end },
      },
    });
    const focusDuration = sessions.reduce((sum, s) => sum + s.durationMin, 0);

    // Habit check-ins (count entries in habit_checkins for this week)
    const habitCheckIns = await prisma.habitCheckin.count({
      where: {
        childId: targetChildId,
        date: { gte: startStr, lt: endStr },
      },
    });

    res.json({
      code: 200,
      data: {
        focusDuration,
        taskTotal: allTasks,
        taskDone: doneTasks,
        taskCompletionRate: allTasks > 0 ? Math.round((doneTasks / allTasks) * 100) : 0,
        habitCheckIns,
        weekStart: startStr,
        weekEnd: endStr,
      },
    });
  } catch (err) {
    const e = err as { statusCode?: number; message: string };
    res.status(e.statusCode ?? 500).json({ code: e.statusCode ?? 500, message: e.message });
  }
});

export default router;
