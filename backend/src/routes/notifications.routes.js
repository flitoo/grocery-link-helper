const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { parseId } = require('../validators/ids.validator');
const model = require('../models/notifications.model');

router.use(requireAuth);
router.get('/', async (req, res) => {
  try {
    // Catch up after downtime, even if a background scan has not run yet.
    await model.generateDelayNotifications({ customerId: req.user.userId });
    return res.json({ notifications: await model.listNotifications(req.user.userId) });
  } catch (error) {
    console.error('Failed to load notifications:', error);
    return res.status(500).json({ errors: ['Unable to load delivery notifications. Please try again.'] });
  }
});
router.patch('/read-all', async (req, res) => {
  try {
    await model.markAllRead(req.user.userId);
    return res.json({ message: 'Notifications marked as read.' });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    return res.status(500).json({ errors: ['Unable to update notifications.'] });
  }
});
router.patch('/:id/read', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ errors: ['Invalid notification ID.'] });
  try {
    const notification = await model.markRead(req.user.userId, id);
    if (!notification) return res.status(404).json({ errors: ['Notification not found.'] });
    return res.json({ notification });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return res.status(500).json({ errors: ['Unable to update notification.'] });
  }
});
module.exports = router;
