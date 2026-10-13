import express from 'express';
import { z } from 'zod';

import { errorHandler, notFoundHandler } from './http/errors';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { insumosRouter } from './routes/insumos';
import { receitasRouter } from './routes/receitas';

// Mensagens padrão de validação do Zod em português.
z.config(z.locales.pt());

export const app = express();

app.use(express.json());

app.use(healthRouter);
app.use(authRouter);
app.use(insumosRouter);
app.use(receitasRouter);

app.use(notFoundHandler);
app.use(errorHandler);
