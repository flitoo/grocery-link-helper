const express = require('express');
const config = require('./config');
const healthRoutes = require('./routes/health.routes');

const app = express();

app.use(express.json());

app.use('/health', healthRoutes);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
