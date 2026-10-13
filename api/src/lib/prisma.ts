import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { env } from '../env';
import { PrismaClient } from '../generated/prisma/client';

const url = new URL(env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  connectionLimit: 5,
  // Falha rápido quando o banco está fora do ar, em vez de segurar a requisição por 10 s.
  acquireTimeout: 3000,
  // Necessário para autenticar no MySQL 8 sem TLS (ambiente local).
  allowPublicKeyRetrieval: true,
});

export const prisma = new PrismaClient({ adapter });
