import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { AppError } from './errorHandler';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token missing or malformed', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role,
    };
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED'));
  }
};
