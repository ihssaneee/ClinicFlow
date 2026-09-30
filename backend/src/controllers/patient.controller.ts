import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../errors/http-error';
import {
  createPatient,
  deletePatient,
  getPatient,
  listPatients,
  restorePatient,
  updatePatient,
} from '../services/patient.service';
import type { PatientInput } from '../types/patient';

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const patientBodySchema = z.object({
  fullName: z.string().trim().min(1, 'Le nom complet est obligatoire.'),
  cin: z.string().trim().min(1, 'Le CIN est obligatoire.'),
  phone: z.string().trim().min(1, 'Le téléphone est obligatoire.'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La date de naissance doit être au format AAAA-MM-JJ.')
    .refine((value) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }, 'La date de naissance est invalide.')
    .refine((value) => value <= todayIso(), 'La date de naissance ne peut pas être dans le futur.'),
  address: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => value || null),
});

const listQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const idParamSchema = z.object({
  id: z.uuid('Identifiant patient invalide.'),
});

function validationError(error: z.ZodError): HttpError {
  return new HttpError(
    400,
    'Données invalides.',
    error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  );
}

function actorId(req: Request): string {
  if (!req.user) {
    throw new HttpError(401, 'Authentification requise.');
  }
  return req.user.id;
}

function parsePatientBody(body: unknown): PatientInput {
  const parsed = patientBodySchema.safeParse(body);
  if (!parsed.success) {
    throw validationError(parsed.error);
  }
  return parsed.data;
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patient = await createPatient(parsePatientBody(req.body), actorId(req));
    res.status(201).json({ patient });
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw validationError(parsed.error);
    }
    if (parsed.data.archived && req.user?.role !== 'admin') {
      throw new HttpError(403, 'Accès refusé.');
    }
    const result = await listPatients(
      parsed.data.search,
      parsed.data.page,
      parsed.data.limit,
      parsed.data.archived,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw validationError(parsed.error);
    }
    const patient = await getPatient(parsed.data.id);
    res.status(200).json({ patient });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = idParamSchema.safeParse(req.params);
    if (!parsedId.success) {
      throw validationError(parsedId.error);
    }
    const patient = await updatePatient(parsedId.data.id, parsePatientBody(req.body), actorId(req));
    res.status(200).json({ patient });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw validationError(parsed.error);
    }
    await deletePatient(parsed.data.id, actorId(req));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function restore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw validationError(parsed.error);
    }
    const patient = await restorePatient(parsed.data.id, actorId(req));
    res.status(200).json({ patient });
  } catch (error) {
    next(error);
  }
}
