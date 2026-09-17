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
    pgm.createTable("rides", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()")
        },

        rider_id: {
            type: "uuid",
            notNull: true,
            references: "users(id)"
        },

        driver_id: {
            type: "uuid",
            references: "drivers(id)"
        },

        pickup_lat: {
            type: "decimal(10,7)",
            notNull: true
        },

        pickup_lng: {
            type: "decimal(10,7)",
            notNull: true
        },

        dropoff_lat: {
            type: "decimal(10,7)",
            notNull: true
        },

        dropoff_lng: {
            type: "decimal(10,7)",
            notNull: true
        },

        status: {
            type: "varchar(30)",
            notNull: true,
            default: "REQUESTED"
        },

        fare: {
            type: "decimal(10,2)"
        },

        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("CURRENT_TIMESTAMP")
        },

        accepted_at: {
            type: "timestamp"
        },

        started_at: {
            type: "timestamp"
        },

        completed_at: {
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
    pgm.dropTable("rides"); 
};
