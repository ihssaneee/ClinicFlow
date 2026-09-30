import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/http-error';
import type { Role } from '../types/auth';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'Authentification requise.'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, 'Accès refusé.'));
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');

export const requireStaff = requireRole('admin', 'staff');
