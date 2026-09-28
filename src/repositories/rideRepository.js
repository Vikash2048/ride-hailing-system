import { pool } from "../config/db.js";

const createRide = async (riderId, pickupLat, pickupLng, dropoffLat, dropoffLng, idempotencyKey) => {
    const client = await pool.connect();
    await client.query("BEGIN");

    try {
        const result = await client.query(
        `INSERT INTO rides (
            rider_id,
            pickup_lat,
            pickup_lng,
            dropoff_lat,
            dropoff_lng,
            idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (idempotency_key)
        DO NOTHING
        RETURNING *`,
        [
            riderId,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
            idempotencyKey
        ]
    );

    // Existing idempotent request
    if (result.rows.length === 0) {
        const existing = await client.query(
            `SELECT * 
            FROM rides
            WHERE idempotency_key = $1`,
            [idempotencyKey]
        );

        await client.query("COMMIT");

        return { ride: existing.rows[0], created: false}
        
    }

    const ride = result.rows[0];

    // create outbox event
    await client.query(
        `INSERT INTO outbox_events (
            event_type,
            aggregate_id,
            payload
        )
        VALUES ($1, $2, $3)`,
        [
            "RideCreated",
            ride.id,
            JSON.stringify({
                rideId: ride.id,
                riderId: ride.rider_id,
                pickupLat: ride.pickup_lat,
                pickupLng: ride.pickup_lng,
                dropoffLat: ride.dropoff_lat,
                dropoffLng: ride.dropoff_lng
            })
        ]
    );

    await client.query("COMMIT");

    return { ride, created: true };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    
    
};

const getRideById = async (rideId) => {
    const result = await pool.query(
        `SELECT *
        FROM rides
        WHERE id = $1`,
        [rideId]
    );

    return result.rows[0];
}

const assignDriver = async (rideId, driverId) => {
    const result = await pool.query(
        `UPDATE rides
        SET driver_id = $1
        WHERE id = $2
        AND status = 'REQUESTED'
        RETURNING *`,
        [driverId, rideId]
    );

    return result.rows[0];
}

const acceptRide = async (rideId, driverId) => {
    const result = await pool.query(
        `UPDATE rides
        SET 
            status = 'ACCEPTED',
            accepted_at = CURRENT_TIMESTAMP
        WHERE 
            id = $1
            AND driver_id = $2
            AND status = 'REQUESTED'
        RETURNING *`,
        [rideId, driverId]
    );

    return result.rows[0] || null;
}

const rejectRide = async (rideId, driverId) => {
    const result = await pool.query(
         `SELECT *
         FROM rides
         WHERE id = $1
           AND driver_id = $2
           AND status = 'REQUESTED'`,
        [rideId, driverId]
    );

    return result.rows[0];
}

const clearDriver = async (rideId, driverId) => {
    const result = await pool.query(
        `UPDATE rides
         SET driver_id = NULL
         WHERE id = $1
           AND driver_id = $2
           AND status = 'REQUESTED'
         RETURNING *`,
        [rideId, driverId]
    );

    return result.rows[0];
}

const driverArriving = async (rideId, driverId) => {
    const result = await pool.query(
        `UPDATE rides
        SET status = 'DRIVER_ARRIVING'
        WHERE id = $1
            AND driver_id = $2
            AND status = 'ACCEPTED'
        RETURNING *`,
        [rideId, driverId]
    );

    return result.rows[0];
};

const startRide = async (rideId, driverId) => {
    const result = await pool.query(
        `UPDATE rides
        SET status = 'IN_PROGRESS',
            started_at = CURRENT_TIMESTAMP
        WHERE id = $1
            AND driver_id = $2
            AND status = 'DRIVER_ARRIVING'
        RETURNING *`,
        [rideId, driverId]
    );

    return result.rows[0];
}

const completeRide = async (rideId, driverId, fare) => {
    const result = await pool.query(
        `UPDATE rides
        SET status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            fare = $1
        WHERE id = $2
            AND driver_id = $3
            AND status = 'IN_PROGRESS'
        RETURNING *`,
        [fare, rideId, driverId]
    );

    return result.rows[0];
}

const cancelRide = async (rideId, riderId) => {
    const result = await pool.query(
        `UPDATE rides
        SET status = 'CANCELLED'
        WHERE id = $1
            AND rider_id = $2
            AND status IN ('REQUESTED', 'ACCEPTED')
        RETURNING *`,
        [rideId, riderId]
    );

    return result.rows[0];
}

const getRidesByRider = async (riderId, limit, offset) => {
    const result = await pool.query(
        `SELECT *
        FROM rides
        WHERE rides_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        OFFSET $3`,
        [riderId, limit, offset]
    );

    return result.rows;
}

export default { createRide, assignDriver, acceptRide, rejectRide, clearDriver, driverArriving, startRide,  completeRide, getRideById, cancelRide, getRidesByRider };