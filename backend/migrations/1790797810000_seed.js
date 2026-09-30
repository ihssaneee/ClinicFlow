/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * 1 admin, 1 staff, 5 patients, 10 appointments.
 * Every account password is Password123!
 * Times are Africa/Casablanca local time, relative to the day this migration runs.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO users (id, full_name, email, password_hash, role) VALUES
      (
        '11111111-1111-4111-8111-111111111111',
        'Nadia El Fassi',
        'admin@clinicflow.ma',
        '$2b$10$1Dw6.zjOeuapBYJ51vc4nOYVwKLx.scMu2Wa2FhfwB9lpg8cD.z3y',
        'admin'
      ),
      (
        '22222222-2222-4222-8222-222222222222',
        'Sara Mansouri',
        'sara.mansouri@clinicflow.ma',
        '$2b$10$EkQQEUYbVuaMy4/ykN6zVe4.kWrVcPq02MDhht391YUax9zBB/yXa',
        'staff'
      );
  `);

  pgm.sql(`
    INSERT INTO patients (id, full_name, cin, phone, birth_date, address) VALUES
      (
        '10000000-0000-4000-8000-000000000001',
        'Amina Benali',
        'BK123456',
        '0612345678',
        DATE '1990-04-12',
        '12 rue des Orangers, Casablanca'
      ),
      (
        '10000000-0000-4000-8000-000000000002',
        'Youssef El Amrani',
        'AB234567',
        '0623456789',
        DATE '1985-11-03',
        '45 avenue Hassan II, Rabat'
      ),
      (
        '10000000-0000-4000-8000-000000000003',
        'Fatima Zahra Idrissi',
        'CD345678',
        '0634567890',
        DATE '2001-07-19',
        '8 boulevard Zerktouni, Casablanca'
      ),
      (
        '10000000-0000-4000-8000-000000000004',
        'Omar Tazi',
        'EF456789',
        '0645678901',
        DATE '1976-01-28',
        '23 rue Ibn Sina, Fès'
      ),
      (
        '10000000-0000-4000-8000-000000000005',
        'Sara Bennani',
        'GH567890',
        '0656789012',
        DATE '1998-09-05',
        NULL
      );
  `);

  pgm.sql(`
    INSERT INTO appointments (id, patient_id, appointment_date, status, reason, notes, created_by) VALUES
      (
        '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + time '09:00') AT TIME ZONE 'Africa/Casablanca',
        'confirmed',
        'Consultation générale',
        'Première visite.',
        '22222222-2222-4222-8222-222222222222'
      ),
      (
        '20000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + time '11:00') AT TIME ZONE 'Africa/Casablanca',
        'pending',
        'Suivi de traitement',
        NULL,
        '22222222-2222-4222-8222-222222222222'
      ),
      (
        '20000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000002',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + time '09:30') AT TIME ZONE 'Africa/Casablanca',
        'confirmed',
        'Contrôle tension',
        'Apporter le carnet de suivi.',
        '22222222-2222-4222-8222-222222222222'
      ),
      (
        '20000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000002',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + interval '1 day' + time '09:30') AT TIME ZONE 'Africa/Casablanca',
        'confirmed',
        'Résultats d''analyses',
        NULL,
        '22222222-2222-4222-8222-222222222222'
      ),
      (
        '20000000-0000-4000-8000-000000000005',
        '10000000-0000-4000-8000-000000000003',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + time '14:00') AT TIME ZONE 'Africa/Casablanca',
        'pending',
        'Douleur abdominale',
        NULL,
        '11111111-1111-4111-8111-111111111111'
      ),
      (
        '20000000-0000-4000-8000-000000000006',
        '10000000-0000-4000-8000-000000000003',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + time '16:00') AT TIME ZONE 'Africa/Casablanca',
        'cancelled',
        'Renouvellement d''ordonnance',
        'Annulé par la patiente.',
        '11111111-1111-4111-8111-111111111111'
      ),
      (
        '20000000-0000-4000-8000-000000000007',
        '10000000-0000-4000-8000-000000000004',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') - interval '1 day' + time '10:00') AT TIME ZONE 'Africa/Casablanca',
        'confirmed',
        'Bilan annuel',
        NULL,
        '22222222-2222-4222-8222-222222222222'
      ),
      (
        '20000000-0000-4000-8000-000000000008',
        '10000000-0000-4000-8000-000000000004',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') - interval '1 day' + time '10:20') AT TIME ZONE 'Africa/Casablanca',
        'cancelled',
        'Vaccination',
        'Créneau trop proche du bilan : annulé. Un confirmed à 20 minutes aurait été refusé.',
        '22222222-2222-4222-8222-222222222222'
      ),
      (
        '20000000-0000-4000-8000-000000000009',
        '10000000-0000-4000-8000-000000000005',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + time '15:30') AT TIME ZONE 'Africa/Casablanca',
        'pending',
        'Contrôle post-opératoire',
        NULL,
        '22222222-2222-4222-8222-222222222222'
      ),
      (
        '20000000-0000-4000-8000-000000000010',
        '10000000-0000-4000-8000-000000000005',
        (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + interval '3 days' + time '08:30') AT TIME ZONE 'Africa/Casablanca',
        'confirmed',
        'Certificat médical',
        NULL,
        '22222222-2222-4222-8222-222222222222'
      );
  `);

  // The audit trigger logged these inserts. Clear them so the seed matches the brief.
  pgm.sql('TRUNCATE TABLE audit_logs;');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM appointments WHERE id IN (
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000004',
      '20000000-0000-4000-8000-000000000005',
      '20000000-0000-4000-8000-000000000006',
      '20000000-0000-4000-8000-000000000007',
      '20000000-0000-4000-8000-000000000008',
      '20000000-0000-4000-8000-000000000009',
      '20000000-0000-4000-8000-000000000010'
    );

    DELETE FROM patients WHERE id IN (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000005'
    );

    DELETE FROM users WHERE id IN (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222'
    );

    DELETE FROM audit_logs WHERE entity_id IN (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000005',
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000004',
      '20000000-0000-4000-8000-000000000005',
      '20000000-0000-4000-8000-000000000006',
      '20000000-0000-4000-8000-000000000007',
      '20000000-0000-4000-8000-000000000008',
      '20000000-0000-4000-8000-000000000009',
      '20000000-0000-4000-8000-000000000010'
    );
  `);
};
