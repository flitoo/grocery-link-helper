const { loadSlotAvailability } = require('../services/slot-availability.service');

// GET /api/slots — the next 7 days of delivery slots with availability (US-07).
async function listSlots(req, res) {
  try {
    const { capacity, slots } = await loadSlotAvailability();
    return res.status(200).json({ capacity, slots });
  } catch (err) {
    console.error('Failed to list delivery slots:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching delivery slots.'] });
  }
}

module.exports = { listSlots };
