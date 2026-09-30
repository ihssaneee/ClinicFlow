import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/http-error';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    const body: { message: string; errors?: unknown } = { message: err.message };
    if (err.details !== undefined) {
      body.errors = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}
