import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../errors/http-error';
import { login as loginUser } from '../services/auth.service';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Email invalide.')),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Données invalides.',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const result = await loginUser(parsed.data.email, parsed.data.password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export function me(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError(401, 'Authentification requise.'));
    return;
  }

  res.status(200).json({ user: req.user });
}
