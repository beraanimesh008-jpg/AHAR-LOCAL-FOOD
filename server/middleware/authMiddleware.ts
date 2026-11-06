import { Request, Response, NextFunction } from 'express';
import { authService, UserTokenPayload } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required (প্রবেশের টোকেন প্রয়োজন)'
    });
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired session (টোকেনের মেয়াদ শেষ বা ভুল)'
    });
  }

  req.user = payload;
  next();
}

export function requireRole(allowedRoles: ('customer' | 'restaurant' | 'delivery' | 'admin')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated user'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires [${allowedRoles.join(', ')}] role`
      });
    }

    next();
  };
}
