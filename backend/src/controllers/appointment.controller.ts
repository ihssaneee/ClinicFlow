import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../errors/http-error';
import {
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
} from '../services/appointment.service';
import type { AppointmentInput } from '../types/appointment';

const statusSchema = z.enum(['pending', 'confirmed', 'cancelled'], {
  error: 'Statut invalide.',
});

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const appointmentBodySchema = z.object({
  patientId: z.uuid('Identifiant patient invalide.'),
  appointmentDate: z
    .string()
    .trim()
    .refine(
      (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value)),
      'La date du rendez-vous doit inclure une date et une heure.',
    ),
  status: statusSchema,
  reason: z.string().trim().min(1, 'Le motif est obligatoire.'),
  notes: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => value || null),
});

const listQuerySchema = z.object({
  date: z
    .union([
      z.literal('').transform(() => undefined),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit être au format AAAA-MM-JJ.')
        .refine(isRealDate, 'La date est invalide.'),
    ])
    .optional(),
  status: z
    .union([z.literal('').transform(() => undefined), statusSchema])
    .optional(),
});

const idParamSchema = z.object({
  id: z.uuid('Identifiant de rendez-vous invalide.'),
});

const statusBodySchema = z.object({
  status: statusSchema,
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

function parseAppointmentBody(body: unknown): AppointmentInput {
  const parsed = appointmentBodySchema.safeParse(body);
  if (!parsed.success) {
    throw validationError(parsed.error);
  }
  return {
    ...parsed.data,
    appointmentDate: new Date(parsed.data.appointmentDate).toISOString(),
  };
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointment = await createAppointment(parseAppointmentBody(req.body), actorId(req));
    res.status(201).json({ appointment });
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
    const appointments = await listAppointments(parsed.data);
    res.status(200).json({ appointments });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = idParamSchema.safeParse(req.params);
    if (!parsedId.success) {
      throw validationError(parsedId.error);
    }
    const parsedBody = statusBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw validationError(parsedBody.error);
    }
    const appointment = await updateAppointmentStatus(
      parsedId.data.id,
      parsedBody.data.status,
      actorId(req),
    );
    res.status(200).json({ appointment });
  } catch (error) {
    next(error);
  }
}
