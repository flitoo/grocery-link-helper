// user.model.js

const pool = require('../config/db');

async function findUserByEmail(email) {
  const query = 'SELECT id, name, email, password_hash FROM users WHERE email = $1';
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const query = `
    INSERT INTO users (name, email, password_hash, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, name, email
  `;
  const { rows } = await pool.query(query, [name, email, passwordHash]);
  return rows[0];
}

module.exports = { findUserByEmail, createUser };
