require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initRealtime } = require('./realtime/io');
const { markStaleComputersOffline } = require('./services/hardwareService');
const { MonitoringPolicy } = require('./models');

const PORT = process.env.PORT || 5000;

/**
 * Background sweep that marks PCs offline once their agent stops reporting.
 * The interval is taken from the global policy so admins can tune it without
 * a restart.
 */
function startHeartbeatSweep() {
  const sweep = async () => {
    try {
      const policy = await MonitoringPolicy.resolveFor(null);
      const count = await markStaleComputersOffline(policy.heartbeatTimeoutMinutes);
      if (count > 0) {
        console.log(`Heartbeat sweep: marked ${count} computer(s) offline`);
      }
    } catch (err) {
      console.error('Heartbeat sweep failed:', err.message);
    }
  };

  sweep();
  return setInterval(sweep, 60 * 1000);
}

async function start() {
  try {
    await connectDB();

    const server = http.createServer(app);
    const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim());

    initRealtime(server, origins);
    const sweepTimer = startHeartbeatSweep();

    server.listen(PORT, () => {
      console.log(`SmartLab Guardian API running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
    });

    const shutdown = (signal) => {
      console.log(`\n${signal} received, shutting down.`);
      clearInterval(sweepTimer);
      server.close(() => process.exit(0));
      // Do not hang forever if a connection refuses to close.
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
