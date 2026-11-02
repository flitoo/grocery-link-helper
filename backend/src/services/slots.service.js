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
    weekday: 'short',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    weekday: get('weekday'),
  };
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
      grid.push({ start, localDate: local.date, localWeekday: local.weekday, localHour: local.hour });
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

/**
 * "Same time as last time" for a repeat order: the next grid slot on the same
 * local weekday and hour as `previous`. Returns undefined when `previous` is
 * not a valid date or that time isn't on the current grid (e.g. it's inside
 * today's lead time, so next week's falls outside the 7-day window).
 */
function findRecurringSlot(grid, previous, { settings = config.slots } = {}) {
  // new Date(null) is the epoch, so only accept strings and Dates.
  const usable = typeof previous === 'string' || previous instanceof Date;
  const prev = usable ? new Date(previous) : new Date(NaN);
  if (Number.isNaN(prev.getTime())) {
    return undefined;
  }
  const { weekday, hour } = localParts(prev, settings.timeZone);
  return grid.find((s) => s.localWeekday === weekday && s.localHour === hour);
}

/**
 * Up to `limit` available slots closest in time to `target` (a Date), in
 * chronological order, excluding `target` itself. With no target, returns
 * the earliest available slots. `slots` is the output of applyCapacity.
 */
function nearestAvailableSlots(slots, target, limit = 3) {
  const open = slots.filter((s) => s.available);
  const targetMs = target instanceof Date ? target.getTime() : NaN;
  if (Number.isNaN(targetMs)) {
    return open.slice(0, limit);
  }
  const distance = (s) => Math.abs(new Date(s.start).getTime() - targetMs);
  return open
    .filter((s) => distance(s) !== 0)
    .sort((a, b) => distance(a) - distance(b) || a.start.localeCompare(b.start))
    .slice(0, limit)
    .sort((a, b) => a.start.localeCompare(b.start));
}

module.exports = {
  buildSlotGrid,
  validateSlot,
  applyCapacity,
  findRecurringSlot,
  nearestAvailableSlots,
  HOUR_MS,
};
