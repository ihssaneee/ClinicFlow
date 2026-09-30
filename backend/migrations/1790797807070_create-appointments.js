/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * One appointment belongs to one patient and one author (both 1-N).
 * Also creates the audit log and the dashboard view, which need every table.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable(
    'appointments',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      patient_id: {
        type: 'uuid',
        notNull: true,
        references: 'patients',
        onDelete: 'RESTRICT',
        referencesConstraintName: 'appointments_patient_fk',
      },
      appointment_date: { type: 'timestamptz', notNull: true },
      status: { type: 'text', notNull: true, default: 'pending' },
      reason: { type: 'text', notNull: true },
      notes: { type: 'text' },
      created_by: {
        type: 'uuid',
        notNull: true,
        references: 'users',
        onDelete: 'RESTRICT',
        referencesConstraintName: 'appointments_created_by_fk',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('now()'),
      },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('now()'),
      },
      deleted_at: { type: 'timestamptz' },
    },
    {
      comment: 'Appointments. One patient and one author.',
    },
  );

  pgm.addConstraint(
    'appointments',
    'appointments_status_check',
    "CHECK (status IN ('pending', 'confirmed', 'cancelled'))",
  );
  pgm.addConstraint(
    'appointments',
    'appointments_reason_not_blank',
    'CHECK (char_length(btrim(reason)) > 0)',
  );

  pgm.createIndex('appointments', ['patient_id', 'appointment_date'], {
    name: 'idx_appointments_patient_date',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('appointments', ['appointment_date', 'status'], {
    name: 'idx_appointments_date_status',
    where: 'deleted_at IS NULL',
  });

  pgm.createTrigger('appointments', 'appointments_set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'set_updated_at',
    level: 'ROW',
  });

  pgm.createTable(
    'audit_logs',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      user_id: {
        type: 'uuid',
        references: 'users',
        onDelete: 'SET NULL',
        referencesConstraintName: 'audit_logs_user_fk',
      },
      entity_type: { type: 'text', notNull: true },
      entity_id: { type: 'uuid', notNull: true },
      action: { type: 'text', notNull: true },
      changes: { type: 'jsonb', notNull: true },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('now()'),
      },
    },
    {
      comment:
        'Writes on users, patients, and appointments. password_hash is never stored.',
    },
  );
  pgm.addConstraint(
    'audit_logs',
    'audit_logs_action_check',
    "CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))",
  );
  pgm.createIndex(
    'audit_logs',
    [
      'entity_type',
      'entity_id',
      { name: 'created_at', sort: 'DESC' },
    ],
    { name: 'idx_audit_logs_entity' },
  );

  // The API sets the actor with: SET LOCAL app.user_id = '<uuid>'
  pgm.createFunction(
    'write_audit_log',
    [],
    { returns: 'trigger', language: 'plpgsql' },
    `
DECLARE
  actor uuid;
  entity uuid;
  payload jsonb;
BEGIN
  actor := NULLIF(current_setting('app.user_id', true), '')::uuid;

  IF TG_OP = 'DELETE' THEN
    entity := OLD.id;
    payload := jsonb_build_object('old', to_jsonb(OLD) - 'password_hash');
  ELSIF TG_OP = 'UPDATE' THEN
    entity := NEW.id;
    payload := jsonb_build_object(
      'old', to_jsonb(OLD) - 'password_hash',
      'new', to_jsonb(NEW) - 'password_hash'
    );
  ELSE
    entity := NEW.id;
    payload := jsonb_build_object('new', to_jsonb(NEW) - 'password_hash');
  END IF;

  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, changes)
  VALUES (actor, TG_TABLE_NAME, entity, TG_OP, payload);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
`,
  );

  for (const table of ['users', 'patients', 'appointments']) {
    pgm.createTrigger(table, `${table}_audit`, {
      when: 'AFTER',
      operation: ['INSERT', 'UPDATE', 'DELETE'],
      function: 'write_audit_log',
      level: 'ROW',
    });
  }

  // Appointments today use the Africa/Casablanca calendar day.
  // pending_count and confirmed_count are global, excluding soft-deleted rows.
  pgm.createView(
    'dashboard_stats',
    {},
    `
SELECT
  (SELECT count(*)::int FROM patients WHERE deleted_at IS NULL) AS total_patients,
  (
    SELECT count(*)::int
    FROM appointments
    WHERE deleted_at IS NULL
      AND appointment_date >= (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca')) AT TIME ZONE 'Africa/Casablanca'
      AND appointment_date <  (date_trunc('day', now() AT TIME ZONE 'Africa/Casablanca') + interval '1 day') AT TIME ZONE 'Africa/Casablanca'
  ) AS appointments_today,
  (SELECT count(*)::int FROM appointments WHERE deleted_at IS NULL AND status = 'pending') AS pending_count,
  (SELECT count(*)::int FROM appointments WHERE deleted_at IS NULL AND status = 'confirmed') AS confirmed_count
`,
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropView('dashboard_stats');
  pgm.dropTrigger('users', 'users_audit');
  pgm.dropTrigger('patients', 'patients_audit');
  pgm.dropTable('appointments');
  pgm.dropFunction('write_audit_log', []);
  pgm.dropTable('audit_logs');
};
