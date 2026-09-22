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
    pgm.createTable("outbox_events", {
        id: {
            type: "bigserial",
            primaryKey: true
        },

        event_type: {
            type: "varchar(100)",
            notNull: true
        },

        aggregate_id: {
            type: "uuid",
            notNull: true
        },

        payload: {
            type: "jsonb",  // mean json binary
            notNull: true
        },

        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP")
        },

        published_at: {
            type: "timestamp"
        }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
     pgm.dropTable("outbox_events");
};
