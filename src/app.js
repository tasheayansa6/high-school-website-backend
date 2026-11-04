const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const apiRoutes = require('./routes');
const {
  requestLogger,
  apiRateLimiter,
  notFound,
  errorHandler,
} = require('./middleware');

const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(cors(env.getCorsOptions()));
app.use(requestLogger);
app.use(apiRateLimiter);

app.use(express.json({ limit: env.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));

app.use('/api/v1', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
