const { pool } = require('../config/db');

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT user_id AS id, full_name AS name, email, password_hash, role
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash, role = 'Customer' }) {
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, phone_number, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id AS id, full_name AS name, email, role`,
    [name, email, passwordHash, '', role]
  );
  return rows[0];
}

module.exports = { findUserByEmail, createUser };
