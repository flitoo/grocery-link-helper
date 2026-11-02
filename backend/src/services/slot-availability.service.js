const slotsModel = require('../models/slots.model');
const { buildSlotGrid, applyCapacity, HOUR_MS } = require('./slots.service');

/**
 * The bookable slot grid joined with live booking counts (US-07, BR-07).
 * Returns { capacity, grid, slots }: `grid` keeps the Date/local-time fields
 * from buildSlotGrid, `slots` is the API shape from applyCapacity.
 */
async function loadSlotAvailability() {
  const grid = buildSlotGrid();
  if (grid.length === 0) {
    return { capacity: 0, grid, slots: [] };
  }

  const from = grid[0].start;
  const to = new Date(grid[grid.length - 1].start.getTime() + HOUR_MS);
  const [capacity, bookedBySlot] = await Promise.all([
    slotsModel.getCapacity(),
    slotsModel.countActiveOrdersBySlot(from, to),
  ]);

  return { capacity, grid, slots: applyCapacity(grid, bookedBySlot, capacity) };
}

module.exports = { loadSlotAvailability };
