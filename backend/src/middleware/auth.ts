import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未提供认证Token' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    logger.warn('JWT验证失败', { error: err });
    res.status(401).json({ code: 401, message: 'Token无效或已过期' });
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({ code: 403, message: '权限不足' });
      return;
    }
    next();
  };
}
