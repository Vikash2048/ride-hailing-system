import { pool } from "../config/db.js";

const createRide = async (riderId, pickupLat, pickupLng, dropoffLat, dropoffLng) => {
    const result = await pool.query(
        `INSERT INTO rides (
            rider_id,
            pickup_lat,
            pickup_lng,
            dropoff_lat,
            dropoff_lng
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
            riderId,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng
        ]
    );

    return result.rows[0];
};

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

export default { createRide, assignDriver };