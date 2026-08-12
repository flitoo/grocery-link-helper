const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/stores - populates the store dropdown on the order form.
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT store_id, name FROM STORES ORDER BY store_id'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/stores failed:', err.message);
    res.status(500).json({ error: 'Could not load stores.' });
  }
});

module.exports = router;
