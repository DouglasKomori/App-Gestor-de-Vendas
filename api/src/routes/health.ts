import { Router } from 'express';

import { AppError } from '../http/errors';
import { prisma } from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (cause) {
    console.error(cause);
    throw new AppError(
      503,
      'BANCO_INDISPONIVEL',
      'A API está no ar, mas não conseguiu conectar ao banco de dados.',
    );
  }

  res.json({ status: 'ok', database: 'ok' });
});
