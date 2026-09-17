import { pool } from "../config/db.js";

const createDriver = async (userId) => {
    const result = await pool.query(
        `INSERT INTO drivers (user_id)
        VALUES ($1)
        RETURNING id, user_id, status, created_at`,
        [userId]
    );

    return result.rows[0];
};

const updateDriverStatus = async (driverId, status) => {
    const result = await pool.query(
        `UPDATE drivers
        SET status = $1
        WHERE id = $2
        RETURNING id, user_id, status`,
        [status, driverId]
    );

    return result.rows[0];
};

export default { createDriver, updateDriverStatus };