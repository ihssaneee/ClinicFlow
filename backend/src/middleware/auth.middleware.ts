import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../errors/http-error';
import { findUserById } from '../services/auth.service';

type AccessTokenPayload = {
  sub: string;
  role: 'admin' | 'staff';
};

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Authentification requise.'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(new HttpError(401, 'Authentification requise.'));
    return;
  }

  let payload: AccessTokenPayload;
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      next(new HttpError(401, 'Jeton invalide ou expiré.'));
      return;
    }
    payload = { sub: decoded.sub, role: decoded.role };
  } catch {
    next(new HttpError(401, 'Jeton invalide ou expiré.'));
    return;
  }

  try {
    const user = await findUserById(payload.sub);
    if (!user) {
      next(new HttpError(401, 'Jeton invalide ou expiré.'));
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
