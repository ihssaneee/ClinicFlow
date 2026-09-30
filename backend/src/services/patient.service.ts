import { DatabaseError, type PoolClient } from 'pg';
import { pool } from '../config/db';
import { HttpError } from '../errors/http-error';
import type { Patient, PatientInput, PatientList, PatientRow } from '../types/patient';

const patientColumns = `
  id,
  full_name,
  cin,
  phone,
  birth_date::text AS birth_date,
  address,
  created_at
`;

function toPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    fullName: row.full_name,
    cin: row.cin,
    phone: row.phone,
    birthDate: row.birth_date,
    address: row.address,
    createdAt: row.created_at.toISOString(),
  };
}

function likePattern(search: string): string {
  const escaped = search.replace(/[\\%_]/g, (character) => `\\${character}`);
  return `%${escaped}%`;
}

function mapWriteError(error: unknown): never {
  if (error instanceof DatabaseError && error.code === '23505') {
    throw new HttpError(400, 'Un patient avec ce CIN existe déjà.');
  }
  if (error instanceof DatabaseError && error.code === '23514') {
    throw new HttpError(400, 'Données patient invalides.');
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

export async function createPatient(input: PatientInput, actorId: string): Promise<Patient> {
  try {
    return await withActor(actorId, async (client) => {
      const result = await client.query<PatientRow>(
        `INSERT INTO patients (full_name, cin, phone, birth_date, address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${patientColumns}`,
        [input.fullName, input.cin, input.phone, input.birthDate, input.address],
      );
      return toPatient(result.rows[0]);
    });
  } catch (error) {
    mapWriteError(error);
  }
}

export async function listPatients(
  search: string,
  page: number,
  limit: number,
  archived = false,
): Promise<PatientList> {
  const pattern = likePattern(search);
  const where = `
    deleted_at IS ${archived ? 'NOT NULL' : 'NULL'}
    AND (
      $1 = ''
      OR full_name ILIKE $2 ESCAPE '\\'
      OR cin ILIKE $2 ESCAPE '\\'
    )
  `;
  const values = [search, pattern];

  const [countResult, listResult] = await Promise.all([
    pool.query<{ total: number }>(`SELECT count(*)::int AS total FROM patients WHERE ${where}`, values),
    pool.query<PatientRow>(
      `SELECT ${patientColumns}
       FROM patients
       WHERE ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $3 OFFSET $4`,
      [...values, limit, (page - 1) * limit],
    ),
  ]);

  return {
    patients: listResult.rows.map(toPatient),
    page,
    limit,
    total: countResult.rows[0]?.total ?? 0,
  };
}

export async function getPatient(id: string): Promise<Patient> {
  const result = await pool.query<PatientRow>(
    `SELECT ${patientColumns}
     FROM patients
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  const patient = result.rows[0];
  if (!patient) {
    throw new HttpError(404, 'Patient introuvable.');
  }
  return toPatient(patient);
}

export async function updatePatient(id: string, input: PatientInput, actorId: string): Promise<Patient> {
  try {
    return await withActor(actorId, async (client) => {
      const result = await client.query<PatientRow>(
        `UPDATE patients
         SET full_name = $2,
             cin = $3,
             phone = $4,
             birth_date = $5,
             address = $6
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING ${patientColumns}`,
        [id, input.fullName, input.cin, input.phone, input.birthDate, input.address],
      );
      const patient = result.rows[0];
      if (!patient) {
        throw new HttpError(404, 'Patient introuvable.');
      }
      return toPatient(patient);
    });
  } catch (error) {
    mapWriteError(error);
  }
}

export async function deletePatient(id: string, actorId: string): Promise<void> {
  await withActor(actorId, async (client) => {
    const result = await client.query(
      `UPDATE patients
       SET deleted_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (result.rowCount !== 1) {
      throw new HttpError(404, 'Patient introuvable.');
    }
  });
}

export async function restorePatient(id: string, actorId: string): Promise<Patient> {
  return withActor(actorId, async (client) => {
    const result = await client.query<PatientRow>(
      `UPDATE patients
       SET deleted_at = NULL
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING ${patientColumns}`,
      [id],
    );
    const patient = result.rows[0];
    if (!patient) {
      throw new HttpError(404, 'Patient archivé introuvable.');
    }
    return toPatient(patient);
  });
}
