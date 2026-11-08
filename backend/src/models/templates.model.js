
const { pool } = require('../config/db');

// Save a grocery template
async function createTemplate({ customerId, name, items }) {
  const result = await pool.query(
    `INSERT INTO grocery_templates
       (customer_id, name, items)
     VALUES ($1, $2, $3::jsonb)
     RETURNING
       template_id, customer_id, name, items, created_at`,
    [customerId, name, JSON.stringify(items)]
  );

  return result.rows[0];
}

// Get all templates for one customer
async function getTemplatesByCustomer(customerId) {
  const result = await pool.query(
    `SELECT
       template_id, customer_id, name, items, created_at
     FROM grocery_templates
     WHERE customer_id = $1
     ORDER BY created_at DESC, template_id DESC`,
    [customerId]
  );

  return result.rows;
}

// Get one template by ID
async function getTemplateById({ templateId, customerId }) {
  const result = await pool.query(
    `SELECT
       template_id, customer_id, name, items, created_at
     FROM grocery_templates
     WHERE template_id = $1
       AND customer_id = $2`,
    [templateId, customerId]
  );

  return result.rows[0];
}

module.exports = {
  createTemplate,
  getTemplatesByCustomer,
  getTemplateById,
};
