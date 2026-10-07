const slotsModel = require('../models/slots.model');
const config = require('../config');
const { buildSlotGrid, applyCapacity } = require('../services/slots.service');

// GET /api/slots — the next 7 days of delivery slots with availability (US-07).
async function listSlots(req, res) {
  try {
    const grid = buildSlotGrid();
    if (grid.length === 0) {
      return res.status(200).json({ capacity: 0, time_zone: config.slots.timeZone, slots: [] });
    }

    const from = grid[0].start;
    const to = new Date(grid[grid.length - 1].start.getTime() + 60 * 60 * 1000);
    const [capacity, bookedBySlot] = await Promise.all([
      slotsModel.getCapacity(),
      slotsModel.countActiveOrdersBySlot(from, to),
    ]);

    return res.status(200).json({
      capacity,
      time_zone: config.slots.timeZone,
      slots: applyCapacity(grid, bookedBySlot, capacity),
    });
  } catch (err) {
    console.error('Failed to list delivery slots:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching delivery slots.'] });
  }
}

module.exports = { listSlots };
