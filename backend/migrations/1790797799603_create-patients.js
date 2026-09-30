/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Patient records. cin stays unique after soft delete so an archived file
 * cannot be recreated with the same national id.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createExtension('pg_trgm', { ifNotExists: true });

  pgm.createTable(
    'patients',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      full_name: { type: 'text', notNull: true },
      cin: { type: 'text', notNull: true },
      phone: { type: 'text', notNull: true },
      birth_date: { type: 'date', notNull: true },
      address: { type: 'text' },
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
    { comment: 'Patient records. cin is unique.' },
  );

  pgm.addConstraint(
    'patients',
    'patients_full_name_not_blank',
    'CHECK (char_length(btrim(full_name)) > 0)',
  );
  pgm.addConstraint(
    'patients',
    'patients_cin_not_blank',
    'CHECK (char_length(btrim(cin)) > 0)',
  );
  pgm.addConstraint('patients', 'patients_cin_unique', 'UNIQUE (cin)');
  pgm.addConstraint(
    'patients',
    'patients_phone_not_blank',
    'CHECK (char_length(btrim(phone)) > 0)',
  );
  pgm.addConstraint(
    'patients',
    'patients_birth_date_not_future',
    'CHECK (birth_date <= CURRENT_DATE)',
  );

  // ILIKE '%term%' cannot use a btree. A trigram GIN index can.
  pgm.createIndex('patients', [{ name: 'full_name', opclass: 'gin_trgm_ops' }], {
    name: 'idx_patients_full_name_trgm',
    method: 'gin',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('patients', [{ name: 'cin', opclass: 'gin_trgm_ops' }], {
    name: 'idx_patients_cin_trgm',
    method: 'gin',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex(
    'patients',
    [
      { name: 'created_at', sort: 'DESC' },
      { name: 'id', sort: 'DESC' },
    ],
    {
      name: 'idx_patients_list',
      where: 'deleted_at IS NULL',
    },
  );

  pgm.createTrigger('patients', 'patients_set_updated_at', {
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
  pgm.dropTable('patients');
  pgm.dropExtension('pg_trgm');
};
