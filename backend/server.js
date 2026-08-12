require('dotenv').config();

const express = require('express');
const cors = require('cors');

const storesRouter = require('./routes/stores');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Allow the React dev server. CORS_ORIGIN pins a single origin; otherwise any
// localhost port is accepted so a Vite port fallback (3001, 3002...) still works.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN
      : (origin, callback) => {
          const allowed = !origin || /^http:\/\/localhost:\d+$/.test(origin);
          callback(allowed ? null : new Error('Origin not allowed'), allowed);
        },
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/stores', storesRouter);
app.use('/api/orders', ordersRouter);

app.listen(PORT, () => {
  console.log(`Grocery Link Helper API listening on http://localhost:${PORT}`);
});
