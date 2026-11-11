
const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const ordersRoutes = require("./routes/orders.routes");
const paymentsRoutes = require("./routes/payments.routes");
const storesRoutes = require("./routes/stores.routes");
const slotsRoutes = require("./routes/slots.routes");
const deliveriesRoutes = require("./routes/deliveries.routes");
const ratingsRoutes = require("./routes/ratings.routes");
const substitutionRequestsRoutes = require("./routes/substitution-requests.routes");

// Template routes
const templatesRoutes = require("./routes/templates.routes");

// Collections routes
const collectionsRoutes = require("./routes/collections.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Health
app.use("/health", healthRoutes);

// Authentication
app.use("/api/auth", authRoutes);

// Orders
app.use("/api/orders", ordersRoutes);

// Payments
app.use("/api/payments", paymentsRoutes);

// Stores
app.use("/api/stores", storesRoutes);

// Delivery slots
app.use("/api/slots", slotsRoutes);

// Deliveries
app.use("/api/deliveries", deliveriesRoutes);

// Ratings
app.use("/api/ratings", ratingsRoutes);

// Substitution requests
app.use(
  "/api/substitution-requests",
  substitutionRequestsRoutes
);

// Templates
app.use("/api/templates", templatesRoutes);

// Grocery Collections
app.use("/api/collections", collectionsRoutes);
app.use("/api/helpers", require("./routes/helpers.routes"));

module.exports = app;
