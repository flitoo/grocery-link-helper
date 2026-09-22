const express = require('express');
const healthRoutes = require('./routes/health.routes');
const ordersRoutes = require('./routes/orders.routes');

const app = express();

app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api/orders', ordersRoutes);

module.exports = app;
