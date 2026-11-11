const router = require('express').Router();
const { requireAuth, requireHelper } = require('../middleware/auth.middleware');
const helpers = require('../models/helpers.model');

router.use(requireAuth, requireHelper);
router.get('/stats', async (req, res) => {
  try {
    return res.json({ stats: await helpers.getStats(req.user.userId) });
  } catch (error) {
    console.error('Failed to load helper stats:', error);
    return res.status(500).json({ errors: ['Unable to load helper statistics.'] });
  }
});
router.get('/history', async (req, res) => {
  const { page = '1', limit = '10' } = req.query;
  if (!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit) ||
      !Number.isSafeInteger(Number(page)) || Number(page) > 1000000 || Number(limit) > 100) {
    return res.status(400).json({ errors: ['Page must be 1-1000000 and limit must be 1-100.'] });
  }
  try {
    const rows = await helpers.getHistory(req.user.userId, Number(limit), (Number(page) - 1) * Number(limit));
    return res.json({ orders: rows.map(({ total_count, ...order }) => order),
      page: Number(page), has_more: rows.length > 0 && Number(page) * Number(limit) < rows[0].total_count });
  } catch (error) {
    console.error('Failed to load helper history:', error);
    return res.status(500).json({ errors: ['Unable to load delivery history.'] });
  }
});
module.exports = router;
