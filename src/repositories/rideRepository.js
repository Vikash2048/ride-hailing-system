import { pool } from "../config/db.js";

const createRide = async (riderId, pickupLat, pickupLng, dropoffLat, dropoffLng, idempotencyKey) => {

    const result = await pool.query(
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
        DO UPDATE SET id = rides.id
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

    return result.rows[0];
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
        SET status = 'ACCEPTED',
            accepted_at = CURRENT_TIMESTAMP
        WHERE id = $1
            AND driver_id = $2
            AND status = 'REQUESTED'
        RETURNING *`,
        [rideId, driverId]
    );

    return result.rows[0];
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

export default { createRide, assignDriver, acceptRide, rejectRide, clearDriver, driverArriving, startRide,  completeRide, getRideById, cancelRide };