const { types } = require('pg');

require('../src/config/db');

const parseTimestamp = types.getTypeParser(1114);

describe('TIMESTAMP parsing', () => {
  it('reads TIMESTAMP values as UTC, not server-local time', () => {
    expect(parseTimestamp('2026-11-05 18:00:00').toISOString()).toBe('2026-11-05T18:00:00.000Z');
  });

  it('keeps fractional seconds', () => {
    expect(parseTimestamp('2026-11-05 18:00:00.123456').toISOString()).toBe('2026-11-05T18:00:00.123Z');
  });
});
