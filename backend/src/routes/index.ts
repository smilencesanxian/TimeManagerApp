import { Router } from 'express';
import authRouter from './auth.js';
import tasksRouter from './tasks.js';
import pomodoroRouter from './pomodoro.js';
import habitsRouter from './habits.js';
import achievementsRouter from './achievements.js';
import aiRouter from './ai.js';
import commentsRouter from './comments.js';
import statsRouter from './stats.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/tasks', tasksRouter);
router.use('/pomodoro', pomodoroRouter);
router.use('/habits', habitsRouter);
router.use('/achievements', achievementsRouter);
router.use('/ai', aiRouter);
router.use('/comments', commentsRouter);
router.use('/stats', statsRouter);

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ code: 200, message: 'OK', timestamp: new Date().toISOString() });
});

export default router;
