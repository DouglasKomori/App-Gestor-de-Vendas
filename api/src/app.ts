import express from 'express';

import { errorHandler, notFoundHandler } from './http/errors';
import { healthRouter } from './routes/health';

export const app = express();

app.use(express.json());

app.use(healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);
