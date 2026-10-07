const config = require('../config');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function now() {
  return new Date(Date.now());
}

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

/**
 * All bookable slot start times, as Date objects on the UTC hour. A slot is
 * one hour long, starts at least `leadHours` from now, falls within the next
 * `windowDays` days, and starts during operating hours in the configured time
 * zone (openHour <= local hour < closeHour).
 */
function buildSlotGrid({ at = now(), settings = config.slots } = {}) {
  const { timeZone, openHour, closeHour, leadHours, windowDays } = settings;
  const earliest = Math.ceil((at.getTime() + leadHours * HOUR_MS) / HOUR_MS) * HOUR_MS;
  const end = at.getTime() + windowDays * DAY_MS;

  const grid = [];
  for (let t = earliest; t < end; t += HOUR_MS) {
    const start = new Date(t);
    const local = localParts(start, timeZone);
    if (local.hour >= openHour && local.hour < closeHour) {
      grid.push({ start, localDate: local.date });
    }
  }
  return grid;
}

/**
 * Checks a client-supplied delivery_slot against the slot grid.
 * Returns { slot: Date } when bookable, or { error: string }.
 */
function validateSlot(input, { at = now(), settings = config.slots } = {}) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return { error: 'delivery_slot must be a valid date/time.' };
  }
  const match = buildSlotGrid({ at, settings }).find((s) => s.start.getTime() === parsed.getTime());
  if (!match) {
    return {
      error:
        'delivery_slot is not an available slot. Slots are hourly, within operating hours, ' +
        `from ${settings.leadHours} hours to ${settings.windowDays} days ahead (see GET /api/slots).`,
    };
  }
  return { slot: match.start };
}

/**
 * Joins the slot grid with booking counts. `bookedBySlot` maps an ISO start
 * time to the number of active orders already in that slot.
 */
function applyCapacity(grid, bookedBySlot, capacity) {
  return grid.map(({ start, localDate }) => {
    const iso = start.toISOString();
    const booked = bookedBySlot.get(iso) || 0;
    const remaining = Math.max(capacity - booked, 0);
    return { start: iso, date: localDate, booked, remaining, available: remaining > 0 };
  });
}

module.exports = { buildSlotGrid, validateSlot, applyCapacity, HOUR_MS };
