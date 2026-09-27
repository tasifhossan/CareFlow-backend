import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler';

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        'Authentication required before authorization. Ensure authenticate middleware is executed first.',
        500,
        'INTERNAL_SERVER_ERROR'
      );
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN');
    }

    next();
  };
};
