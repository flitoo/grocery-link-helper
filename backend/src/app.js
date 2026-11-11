
const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const ordersRoutes = require('./routes/orders.routes');
const paymentsRoutes = require('./routes/payments.routes');
const storesRoutes = require('./routes/stores.routes');
const itemsRoutes = require('./routes/items.routes');
const slotsRoutes = require('./routes/slots.routes');
const deliveriesRoutes = require('./routes/deliveries.routes');
const ratingsRoutes = require('./routes/ratings.routes');
const substitutionRequestsRoutes = require('./routes/substitution-requests.routes');

// Template routes
const templatesRoutes = require('./routes/templates.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/substitution-requests', substitutionRequestsRoutes);

// Save / Retrieve Template API
app.use('/api/templates', templatesRoutes);

module.exports = app;
