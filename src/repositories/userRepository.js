import { pool } from "../config/db.js";

const createUser = async (name, phone, email, password) => {
    const result = await pool.query(
        `INSERT INTO users (name, phone, email, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, phone, email, created_at`,
        [name, phone, email, password]
    );

    return result.rows[0];
}

const findByPhone = async (phone) => {
    const result = await pool.query(
        `SELECT id, name, phone, password_hash
        FROM users
        WHERE phone = $1`,
        [phone]
    );

    return result.rows[0] || null;
}

export default {createUser, findByPhone};