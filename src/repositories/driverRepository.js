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

export default { createDriver };