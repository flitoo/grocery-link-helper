
const templatesModel = require('../models/templates.model');
const { pool } = require('../config/db');

// Check if logged-in user is a Customer
async function getCustomerId(req, res) {
  const userId = Number(req.user?.userId);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    res.status(401).json({
      errors: ['Authentication required.'],
    });
    return null;
  }

  const result = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    res.status(401).json({
      errors: ['User not found.'],
    });
    return null;
  }

  if (user.role !== 'Customer') {
    res.status(403).json({
      errors: ['Only customers can access templates.'],
    });
    return null;
  }

  return userId;
}

// Validate template data
function validateTemplate(body) {
  const errors = [];

  const name =
    typeof body?.name === 'string'
      ? body.name.trim()
      : '';

  if (name.length < 2 || name.length > 100) {
    errors.push(
      'Template name must contain 2 to 100 characters.'
    );
  }

  if (
    !Array.isArray(body?.items) ||
    body.items.length < 1 ||
    body.items.length > 100
  ) {
    errors.push(
      'Template must contain between 1 and 100 items.'
    );

    return { errors, name, items: [] };
  }

  const items = [];
  const seen = new Set();

  body.items.forEach((item, index) => {
    const itemName =
      typeof item?.name === 'string'
        ? item.name.trim()
        : typeof item?.item_name === 'string'
          ? item.item_name.trim()
          : '';

    const quantity = Number(item?.quantity);

    const estimatedPrice = Number(
      item?.estimatedPrice ?? item?.estimated_price
    );

    const allowSubstitution =
      item?.allowSubstitution ??
      item?.allow_substitution ??
      false;

    if (itemName.length < 2 || itemName.length > 50) {
      errors.push(
        `Item ${index + 1}: invalid item name.`
      );
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      errors.push(
        `Item ${index + 1}: invalid quantity.`
      );
    }

    if (
      !Number.isFinite(estimatedPrice) ||
      estimatedPrice <= 0
    ) {
      errors.push(
        `Item ${index + 1}: invalid estimated price.`
      );
    }

    if (typeof allowSubstitution !== 'boolean') {
      errors.push(
        `Item ${index + 1}: invalid substitution value.`
      );
    }

    const key = itemName.toLowerCase();

    if (seen.has(key)) {
      errors.push(`Duplicate item: ${itemName}.`);
    }

    seen.add(key);

    items.push({
      name: itemName,
      quantity,
      estimatedPrice,
      allowSubstitution,
    });
  });

  return { errors, name, items };
}

// POST /api/templates
async function createTemplate(req, res) {
  try {
    const customerId = await getCustomerId(req, res);

    if (!customerId) return;

    const { errors, name, items } =
      validateTemplate(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const template = await templatesModel.createTemplate({
      customerId,
      name,
      items,
    });

    return res.status(201).json(template);
  } catch (error) {
    console.error('Create template failed:', error);

    return res.status(500).json({
      errors: ['Failed to save template.'],
    });
  }
}

// GET /api/templates
async function getTemplates(req, res) {
  try {
    const customerId = await getCustomerId(req, res);

    if (!customerId) return;

    const templates =
      await templatesModel.getTemplatesByCustomer(
        customerId
      );

    return res.status(200).json(templates);
  } catch (error) {
    console.error('Get templates failed:', error);

    return res.status(500).json({
      errors: ['Failed to retrieve templates.'],
    });
  }
}

// GET /api/templates/:id
async function getTemplate(req, res) {
  try {
    const customerId = await getCustomerId(req, res);

    if (!customerId) return;

    const rawId = req.params.id;
    const templateId = Number(rawId);

    if (
      !/^[1-9]\d*$/.test(rawId) ||
      !Number.isSafeInteger(templateId)
    ) {
      return res.status(400).json({
        errors: ['Invalid template ID.'],
      });
    }

    const template = await templatesModel.getTemplateById({
      templateId,
      customerId,
    });

    if (!template) {
      return res.status(404).json({
        errors: ['Template not found.'],
      });
    }

    return res.status(200).json(template);
  } catch (error) {
    console.error('Get template failed:', error);

    return res.status(500).json({
      errors: ['Failed to retrieve template.'],
    });
  }
}

module.exports = {
  createTemplate,
  getTemplates,
  getTemplate,
};
