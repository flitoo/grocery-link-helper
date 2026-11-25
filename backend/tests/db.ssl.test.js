// Loading config/db only builds the pool; nothing here opens a connection.
function loadPoolFor(databaseUrl) {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;
  try {
    let pool;
    jest.isolateModules(() => {
      ({ pool } = require('../src/config/db'));
    });
    return pool;
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
}

describe('database TLS', () => {
  it('verifies the server certificate when the URL requires SSL', async () => {
    const pool = loadPoolFor('postgresql://u:p@example.neon.tech/db?sslmode=require');

    expect(pool.options.ssl).toEqual({ rejectUnauthorized: true });
    await pool.end();
  });

  it('does not use TLS for a plain local URL', async () => {
    const pool = loadPoolFor('postgresql://u:p@localhost:5432/db');

    expect(pool.options.ssl).toBe(false);
    await pool.end();
  });
});
