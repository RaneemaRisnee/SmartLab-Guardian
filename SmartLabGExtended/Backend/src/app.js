const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req, res) => res.send('SmartLab Guardian Backend Running Successfully!'));
app.use('/api/alerts', require('./routes/hardwareAlertRoutes'));
app.use('/api/monitoring', require('./routes/monitoringRoutes'));

// Unknown routes
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Bad JSON body etc.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: status === 400 ? 'Invalid request body' : err.message });
});

module.exports = app;
