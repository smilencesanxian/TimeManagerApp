import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from '../services/authService.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();

// POST /api/v1/auth/wechat-login  微信登录
router.post(
  '/wechat-login',
  [
    body('code').notEmpty().withMessage('code不能为空'),
    body('nickname').optional().isString(),
    body('avatarUrl').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const { code, nickname = '用户', avatarUrl } = req.body as {
        code: string;
        nickname?: string;
        avatarUrl?: string;
      };

      // TODO Phase 7: 生产环境调用微信服务器换取openid
      // 开发阶段直接使用code作为openid（Mock）
      const openid = process.env['NODE_ENV'] === 'production'
        ? await exchangeCodeForOpenid(code)
        : `mock_${code}`;

      const result = await authService.wechatLogin(openid, nickname, avatarUrl);
      res.status(200).json({ code: 200, message: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/register  手机号注册（开发/测试用）
router.post(
  '/register',
  [
    body('phone').matches(/^1[3-9]\d{9}$/).withMessage('手机号格式错误'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('nickname').notEmpty().withMessage('昵称不能为空'),
    body('role').isIn(['parent', 'child']).withMessage('角色必须是parent或child'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const { phone, password, nickname, role } = req.body as {
        phone: string;
        password: string;
        nickname: string;
        role: 'parent' | 'child';
      };
      const result = await authService.registerWithPhone({ phone, password, nickname, role });
      res.status(201).json({ code: 201, message: '注册成功', data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/login  手机号登录
router.post(
  '/login',
  [
    body('phone').notEmpty().withMessage('手机号不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const { phone, password } = req.body as { phone: string; password: string };
      const result = await authService.loginWithPhone(phone, password);
      res.status(200).json({ code: 200, message: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/refresh  刷新Token
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('refreshToken不能为空')],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const { refreshToken } = req.body as { refreshToken: string };
      const tokens = await authService.refreshAccessToken(refreshToken);
      res.status(200).json({ code: 200, message: 'success', data: tokens });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/logout  登出
router.post(
  '/logout',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      res.status(200).json({ code: 200, message: '已登出' });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/v1/auth/role  设置用户角色
router.put(
  '/role',
  authenticate,
  [body('role').isIn(['parent', 'child']).withMessage('角色必须是parent或child')],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const { role } = req.body as { role: 'parent' | 'child' };
      const result = await authService.updateUserRole(req.user!.userId, role);
      res.status(200).json({ code: 200, message: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/auth/invite  家长获取最近的邀请码
router.get(
  '/invite',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.getLatestInviteCode(req.user!.userId);
      if (!result) {
        res.status(404).json({ code: 404, message: '暂无邀请码' });
        return;
      }
      res.status(200).json({ code: 200, message: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/invite  家长生成邀请码
router.post(
  '/invite',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { childNickname } = req.body as { childNickname?: string };
      const result = await authService.generateInviteCode(req.user!.userId, childNickname || '新孩子');
      res.status(200).json({ code: 200, message: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/bind  孩子使用邀请码绑定
router.post(
  '/bind',
  authenticate,
  [body('inviteCode').notEmpty().withMessage('邀请码不能为空')],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ code: 400, message: '参数错误', errors: errors.array() });
      return;
    }

    try {
      const { inviteCode } = req.body as { inviteCode: string };
      const result = await authService.bindWithInviteCode(req.user!.userId, inviteCode);
      res.status(200).json({ code: 200, message: '绑定成功', data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/auth/children  家长获取已绑定孩子列表
router.get(
  '/children',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const children = await authService.getMyChildren(req.user!.userId);
      res.status(200).json({ code: 200, message: 'success', data: children });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/auth/me  获取当前用户信息
router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const { findUserById, findParentsByChildId } = await import('../repositories/userRepository.js');
      const user = await findUserById(userId);
      if (!user) {
        res.status(404).json({ code: 404, message: '用户不存在' });
        return;
      }
      // 孩子账号附带 familyId，供前端判断是否已绑定家长
      let familyId: string | null = null;
      if (user.role === 'child') {
        const families = await findParentsByChildId(userId);
        familyId = families.length > 0 ? families[0].id : null;
      }
      res.status(200).json({
        code: 200,
        message: 'success',
        data: { id: user.id, nickname: user.nickname, role: user.role, avatarUrl: user.avatarUrl, familyId },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 内部函数：调用微信服务器换取openid（生产环境使用）
async function exchangeCodeForOpenid(code: string): Promise<string> {
  const appId = process.env['WECHAT_APP_ID'];
  const appSecret = process.env['WECHAT_APP_SECRET'];

  if (!appId || !appSecret) {
    throw new Error('微信小程序配置缺失');
  }

  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
  const response = await fetch(url);
  const data = await response.json() as { openid?: string; errcode?: number; errmsg?: string };

  if (!data.openid) {
    logger.error('微信换取openid失败', data);
    throw new Error('微信登录失败');
  }

  return data.openid;
}

export default router;
