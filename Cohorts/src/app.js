const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { env, missingVars } = require('./config/env');
const routes = require('./routes');
const notFoundHandler = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

if (missingVars.length > 0) {
  console.warn(`[WARN] Missing env vars: ${missingVars.join(', ')}`);
}

const app = express();

app.use(helmet());

const allowedOrigins = env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.get('/health', (req, res) => res.json({ success: true, message: 'OK' }));

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;