// user.model.js

const { pool } = require('../config/db');

// The users table has NOT NULL phone_number and role columns that the
// register form doesn't collect yet, so fill in placeholders for now.
const DEFAULT_ROLE = 'Customer';
const DEFAULT_PHONE = '';

async function findUserByEmail(email) {
  const query = `
    SELECT user_id AS id, full_name AS name, email, password_hash
    FROM users WHERE email = $1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const query = `
    INSERT INTO users (full_name, email, password_hash, phone_number, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING user_id AS id, full_name AS name, email
  `;
  const { rows } = await pool.query(query, [name, email, passwordHash, DEFAULT_PHONE, DEFAULT_ROLE]);
  return rows[0];
}

module.exports = { findUserByEmail, createUser };
