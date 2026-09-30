import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/db';

const password = 'Password123!';
const stamp = `${Date.now()}`;

const createdUserIds: string[] = [];
const createdPatientIds: string[] = [];
const createdAppointmentIds: string[] = [];

let adminEmail = '';
let staffEmail = '';
let adminToken = '';
let staffToken = '';

async function createUser(role: 'admin' | 'staff'): Promise<string> {
  const email = `jest-${role}-${stamp}@clinicflow.test`;
  const passwordHash = await bcrypt.hash(password, 4);
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [`Jest ${role}`, email, passwordHash, role],
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('Failed to create test user');
  }
  createdUserIds.push(id);
  return email;
}

async function login(email: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  if (response.status !== 200 || typeof response.body.token !== 'string') {
    throw new Error(`Login failed for ${email}`);
  }
  return response.body.token;
}

function patientBody(cin: string) {
  return {
    fullName: 'Patient Jest',
    cin,
    phone: '0600000000',
    birthDate: '1990-01-15',
  };
}

async function cleanup(): Promise<void> {
  const deletedAppointments = await pool.query<{ id: string }>(
    `DELETE FROM appointments
     WHERE id = ANY($1::uuid[])
        OR patient_id = ANY($2::uuid[])
        OR created_by = ANY($3::uuid[])
     RETURNING id`,
    [createdAppointmentIds, createdPatientIds, createdUserIds],
  );
  await pool.query(`DELETE FROM patients WHERE id = ANY($1::uuid[])`, [createdPatientIds]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [createdUserIds]);
  const entityIds = [
    ...createdUserIds,
    ...createdPatientIds,
    ...createdAppointmentIds,
    ...deletedAppointments.rows.map((row) => row.id),
  ];
  await pool.query(
    `DELETE FROM audit_logs
     WHERE entity_id = ANY($1::uuid[])
        OR user_id = ANY($2::uuid[])`,
    [entityIds, createdUserIds],
  );
}

beforeAll(async () => {
  adminEmail = await createUser('admin');
  staffEmail = await createUser('staff');
  adminToken = await login(adminEmail);
  staffToken = await login(staffEmail);
});

afterAll(async () => {
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
});

describe('login', () => {
  it('returns a token for valid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: adminEmail,
      password,
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(0);
    expect(response.body.user).toMatchObject({
      email: adminEmail,
      role: 'admin',
    });
  });

  it('rejects a wrong password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: adminEmail,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Email ou mot de passe incorrect.');
  });
});

describe('auth middleware', () => {
  it('requires a bearer token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentification requise.');
  });

  it('rejects an invalid token', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Jeton invalide ou expiré.');
  });

  it('accepts a valid token', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: staffEmail,
      role: 'staff',
    });
  });
});

describe('patient deletion', () => {
  it('allows only an admin to delete a patient', async () => {
    const created = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(patientBody(`JESTDEL${stamp}`));

    expect(created.status).toBe(201);
    const patientId = created.body.patient.id as string;
    createdPatientIds.push(patientId);

    const asStaff = await request(app)
      .delete(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(asStaff.status).toBe(403);
    expect(asStaff.body.message).toBe('Accès refusé.');

    const asAdmin = await request(app)
      .delete(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(asAdmin.status).toBe(204);

    const fetched = await request(app)
      .get(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fetched.status).toBe(404);
  });
});

describe('duplicate CIN', () => {
  it('rejects a second patient with the same CIN', async () => {
    const cin = `JESTCIN${stamp}`;
    const first = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(patientBody(cin));

    expect(first.status).toBe(201);
    createdPatientIds.push(first.body.patient.id as string);

    const duplicate = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(patientBody(cin));

    expect(duplicate.status).toBe(400);
    expect(duplicate.body.message).toBe('Un patient avec ce CIN existe déjà.');
  });
});

describe('confirmed appointment conflict', () => {
  it('rejects a confirmed appointment within 30 minutes of another', async () => {
    const created = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(patientBody(`JESTAPT${stamp}`));

    expect(created.status).toBe(201);
    const patientId = created.body.patient.id as string;
    createdPatientIds.push(patientId);

    const first = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId,
        appointmentDate: '2035-06-15T10:00:00.000Z',
        status: 'confirmed',
        reason: 'Consultation',
      });

    expect(first.status).toBe(201);
    createdAppointmentIds.push(first.body.appointment.id as string);

    const conflict = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId,
        appointmentDate: '2035-06-15T10:20:00.000Z',
        status: 'confirmed',
        reason: 'Contrôle',
      });

    expect(conflict.status).toBe(400);
    expect(conflict.body.message).toBe('Ce patient a déjà un rendez-vous confirmé dans les 30 minutes.');
  });
});
