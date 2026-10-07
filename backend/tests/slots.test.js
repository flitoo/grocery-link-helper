jest.mock('../src/models/slots.model');

const request = require('supertest');
const app = require('../src/app');
const slotsModel = require('../src/models/slots.model');
const { buildSlotGrid, validateSlot, applyCapacity } = require('../src/services/slots.service');

// 2026-10-06 08:00 Toronto (EDT, UTC-4)
const NOW = new Date('2026-10-06T12:00:00.000Z');

const settings = {
  timeZone: 'America/Toronto',
  openHour: 8,
  closeHour: 21,
  leadHours: 2,
  windowDays: 7,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('buildSlotGrid', () => {
  const grid = buildSlotGrid({ at: NOW, settings });

  it('starts at least leadHours from now, on the hour', () => {
    expect(grid[0].start.toISOString()).toBe('2026-10-06T14:00:00.000Z');
  });

  it('only includes slots inside operating hours (Toronto local time)', () => {
    const localHours = grid.map((s) =>
      Number(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: settings.timeZone,
          hour: '2-digit',
          hourCycle: 'h23',
        }).format(s.start)
      )
    );
    expect(Math.min(...localHours)).toBe(8);
    expect(Math.max(...localHours)).toBe(20);
  });

  it('stays within the 7-day window', () => {
    const last = grid[grid.length - 1].start.getTime();
    expect(last).toBeLessThan(NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
  });

  it('labels each slot with its local date', () => {
    // 2026-10-07T03:00Z is 11 PM Oct 6 in Toronto, but closed; 2026-10-07T12:00Z is Oct 7 8 AM.
    const slot = grid.find((s) => s.start.toISOString() === '2026-10-07T12:00:00.000Z');
    expect(slot.localDate).toBe('2026-10-07');
  });
});

describe('validateSlot', () => {
  it('accepts a slot on the grid and returns a Date', () => {
    const result = validateSlot('2026-10-07T18:00:00.000Z', { at: NOW, settings });
    expect(result.slot.toISOString()).toBe('2026-10-07T18:00:00.000Z');
  });

  it('rejects garbage input', () => {
    expect(validateSlot('nope', { at: NOW, settings }).error).toMatch(/valid date/);
  });

  it('rejects a slot inside the lead time', () => {
    expect(validateSlot('2026-10-06T13:00:00.000Z', { at: NOW, settings }).error).toMatch(
      /not an available slot/
    );
  });
});

describe('applyCapacity', () => {
  const grid = [
    { start: new Date('2026-10-07T18:00:00.000Z'), localDate: '2026-10-07' },
    { start: new Date('2026-10-07T19:00:00.000Z'), localDate: '2026-10-07' },
  ];

  it('marks a slot unavailable once bookings reach capacity', () => {
    const booked = new Map([['2026-10-07T18:00:00.000Z', 2]]);
    const [full, open] = applyCapacity(grid, booked, 2);
    expect(full).toMatchObject({ booked: 2, remaining: 0, available: false });
    expect(open).toMatchObject({ booked: 0, remaining: 2, available: true });
  });

  it('never reports negative remaining', () => {
    const booked = new Map([['2026-10-07T18:00:00.000Z', 5]]);
    expect(applyCapacity(grid, booked, 2)[0].remaining).toBe(0);
  });

  it('treats every slot as full when there are no helpers', () => {
    expect(applyCapacity(grid, new Map(), 0).every((s) => !s.available)).toBe(true);
  });
});

describe('GET /api/slots', () => {
  it('returns slots with availability and capacity', async () => {
    slotsModel.getCapacity.mockResolvedValue(2);
    slotsModel.countActiveOrdersBySlot.mockResolvedValue(
      new Map([['2026-10-07T18:00:00.000Z', 2]])
    );

    const res = await request(app).get('/api/slots');

    expect(res.status).toBe(200);
    expect(res.body.capacity).toBe(2);
    const full = res.body.slots.find((s) => s.start === '2026-10-07T18:00:00.000Z');
    expect(full).toMatchObject({ booked: 2, remaining: 0, available: false });
    const open = res.body.slots.find((s) => s.start === '2026-10-07T19:00:00.000Z');
    expect(open.available).toBe(true);
  });

  it('returns 500 when the database fails', async () => {
    slotsModel.getCapacity.mockRejectedValue(new Error('connection reset'));
    slotsModel.countActiveOrdersBySlot.mockResolvedValue(new Map());

    const res = await request(app).get('/api/slots');

    expect(res.status).toBe(500);
  });
});
