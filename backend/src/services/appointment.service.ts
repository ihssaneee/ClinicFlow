import { DatabaseError, type PoolClient } from 'pg';
import { pool } from '../config/db';
import { HttpError } from '../errors/http-error';
import type {
  Appointment,
  AppointmentInput,
  AppointmentListFilters,
  AppointmentRow,
  AppointmentStatus,
} from '../types/appointment';

const appointmentColumns = `
  id,
  patient_id,
  appointment_date,
  status,
  reason,
  notes,
  created_by,
  created_at
`;

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    appointmentDate: row.appointment_date.toISOString(),
    status: row.status,
    reason: row.reason,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

function mapWriteError(error: unknown): never {
  if (error instanceof DatabaseError && error.code === '23514') {
    throw new HttpError(400, 'Données de rendez-vous invalides.');
  }
  if (error instanceof DatabaseError && error.code === '23503') {
    throw new HttpError(404, 'Patient introuvable.');
  }
  throw error;
}

async function withActor<T>(actorId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [actorId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function lockActivePatient(client: PoolClient, patientId: string): Promise<void> {
  const result = await client.query(
    `SELECT id
     FROM patients
     WHERE id = $1 AND deleted_at IS NULL
     FOR UPDATE`,
    [patientId],
  );
  if (result.rowCount !== 1) {
    throw new HttpError(404, 'Patient introuvable.');
  }
}

async function assertNoConfirmedConflict(
  client: PoolClient,
  patientId: string,
  appointmentDate: string,
  excludeId: string | null,
): Promise<void> {
  const result = await client.query(
    `SELECT id
     FROM appointments
     WHERE patient_id = $1
       AND deleted_at IS NULL
       AND status = 'confirmed'
       AND ($2::uuid IS NULL OR id <> $2::uuid)
       AND appointment_date > $3::timestamptz - interval '30 minutes'
       AND appointment_date < $3::timestamptz + interval '30 minutes'
     LIMIT 1`,
    [patientId, excludeId, appointmentDate],
  );
  if ((result.rowCount ?? 0) > 0) {
    throw new HttpError(400, 'Ce patient a déjà un rendez-vous confirmé dans les 30 minutes.');
  }
}

export async function createAppointment(input: AppointmentInput, actorId: string): Promise<Appointment> {
  try {
    return await withActor(actorId, async (client) => {
      await lockActivePatient(client, input.patientId);
      if (input.status === 'confirmed') {
        await assertNoConfirmedConflict(client, input.patientId, input.appointmentDate, null);
      }

      const result = await client.query<AppointmentRow>(
        `INSERT INTO appointments (patient_id, appointment_date, status, reason, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${appointmentColumns}`,
        [input.patientId, input.appointmentDate, input.status, input.reason, input.notes, actorId],
      );
      return toAppointment(result.rows[0]);
    });
  } catch (error) {
    mapWriteError(error);
  }
}

export async function listAppointments(filters: AppointmentListFilters): Promise<Appointment[]> {
  const result = await pool.query<AppointmentRow>(
    `SELECT ${appointmentColumns}
     FROM appointments
     WHERE deleted_at IS NULL
       AND ($1::date IS NULL OR (appointment_date AT TIME ZONE 'Africa/Casablanca')::date = $1::date)
       AND ($2::text IS NULL OR status = $2)
     ORDER BY appointment_date ASC, id ASC`,
    [filters.date ?? null, filters.status ?? null],
  );
  return result.rows.map(toAppointment);
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  actorId: string,
): Promise<Appointment> {
  try {
    return await withActor(actorId, async (client) => {
      const existing = await client.query<{ patient_id: string; appointment_date: Date }>(
        `SELECT patient_id, appointment_date
         FROM appointments
         WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      const current = existing.rows[0];
      if (!current) {
        throw new HttpError(404, 'Rendez-vous introuvable.');
      }

      await lockActivePatient(client, current.patient_id);
      const locked = await client.query<AppointmentRow>(
        `SELECT ${appointmentColumns}
         FROM appointments
         WHERE id = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [id],
      );
      if (!locked.rows[0]) {
        throw new HttpError(404, 'Rendez-vous introuvable.');
      }

      if (status === 'confirmed') {
        await assertNoConfirmedConflict(
          client,
          current.patient_id,
          current.appointment_date.toISOString(),
          id,
        );
      }

      const result = await client.query<AppointmentRow>(
        `UPDATE appointments
         SET status = $2
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING ${appointmentColumns}`,
        [id, status],
      );
      return toAppointment(result.rows[0]);
    });
  } catch (error) {
    mapWriteError(error);
  }
}
