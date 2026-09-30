/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Staff accounts. Roles are a closed set (admin | staff), so a CHECK is enough.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable(
    'users',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      full_name: { type: 'text', notNull: true },
      email: { type: 'text', notNull: true },
      password_hash: { type: 'text', notNull: true },
      role: { type: 'text', notNull: true, default: 'staff' },
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
    { comment: 'Clinic staff. role is admin or staff.' },
  );

  pgm.addConstraint(
    'users',
    'users_full_name_not_blank',
    'CHECK (char_length(btrim(full_name)) > 0)',
  );
  pgm.addConstraint(
    'users',
    'users_email_lowercase',
    'CHECK (email = lower(email))',
  );
  pgm.addConstraint(
    'users',
    'users_email_format',
    "CHECK (position('@' IN email) > 1)",
  );
  pgm.addConstraint('users', 'users_email_unique', 'UNIQUE (email)');
  pgm.addConstraint(
    'users',
    'users_role_check',
    "CHECK (role IN ('admin', 'staff'))",
  );

  pgm.createFunction(
    'set_updated_at',
    [],
    { returns: 'trigger', language: 'plpgsql' },
    `
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
`,
  );

  pgm.createTrigger('users', 'users_set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'set_updated_at',
    level: 'ROW',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('users');
  pgm.dropFunction('set_updated_at', []);
};
