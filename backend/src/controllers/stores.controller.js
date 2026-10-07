const storesModel = require('../models/stores.model');

// GET /api/stores — active stores for the store selection screen.
async function listStores(req, res) {
  try {
    const stores = await storesModel.listActiveStores();
    return res.status(200).json({ stores });
  } catch (err) {
    console.error('Failed to list stores:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching stores.'] });
  }
}

module.exports = { listStores };
