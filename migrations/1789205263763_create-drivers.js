/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createTable("drivers", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()")
        },

        user_id: {
            type: "uuid",
            notNull: true,
            unique: true,
            references: "users(id)",
            onDelete: "CASCADE"
        },

        status: {
            type: "varchar(20)",
            notNull: true,
            default: "OFFLINE"
        },

        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP")
        }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable("drivers");
};
