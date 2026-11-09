import { Router, Request, Response } from 'express';
import { db } from '../db';
import { notificationService } from '../services/notificationService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

export const notificationRouter = Router();

// Get notifications for current user
notificationRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const notifications = await notificationService.getUserNotifications(req.user!.id, req.user!.role);
  return res.json({
    success: true,
    data: notifications
  });
});

// Mark notification as read
notificationRouter.put('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const notifId = Number(req.params.id);
  const updated = await notificationService.markAsRead(notifId);
  return res.json({
    success: true,
    data: updated
  });
});
