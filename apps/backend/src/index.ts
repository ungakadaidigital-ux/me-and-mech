import { env } from './config/env';
import { initSentry } from './lib/sentry';
import { logger } from './lib/logger';
import { createApp } from './app';

initSentry();

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Me & Mech API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
