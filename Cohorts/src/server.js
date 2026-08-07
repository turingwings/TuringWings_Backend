const app = require('./app');
const { env } = require('./config/env');

let server;

async function startServer() {
  server = app.listen(env.port, () => {
    console.log(`[Server] Running in ${env.nodeEnv} mode on port ${env.port}`);
  });

  server.on('error', (error) => {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  });
}

function shutdown(signal) {
  console.log(`[Server] ${signal} received, shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('[Server] Closed remaining connections');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();