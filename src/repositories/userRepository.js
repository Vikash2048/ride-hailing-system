import { pool } from "../config/db.js";

const createUser = async (name, phone, email) => {
    const result = await pool.query(
        `INSERT INTO users (name, phone, email)
        VALUES ($1, $2, $3)
        RETURNING id, name, phone, email, created_at`,
        [name, phone, email]
    );

    return result.rows[0];
}

export default {createUser};