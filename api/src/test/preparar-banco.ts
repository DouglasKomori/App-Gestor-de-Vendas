import { execSync } from 'node:child_process';

import type { TestProject } from 'vitest/node';

/**
 * Roda uma vez antes dos testes de API: cria/atualiza o banco de teste com as migrations
 * e apaga os dados deixados pela execução anterior.
 */
export default async function prepararBanco(project: TestProject) {
  const { DATABASE_URL, JWT_SECRET } = project.config.env;

  if (!DATABASE_URL || !new URL(DATABASE_URL).pathname.endsWith('_test')) {
    throw new Error(`Os testes só podem rodar em um banco terminado em "_test": ${DATABASE_URL}`);
  }

  process.env.DATABASE_URL = DATABASE_URL;
  process.env.JWT_SECRET = JWT_SECRET;

  try {
    execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
  } catch (error) {
    const saida = (error as { stdout?: Buffer; stderr?: Buffer }).stderr?.toString() ?? '';
    throw new Error(
      `Não foi possível preparar o banco de teste. O MySQL está rodando (docker compose up -d)?\n${saida}`,
    );
  }

  const { prisma } = await import('../lib/prisma');
  await prisma.receitaItem.deleteMany();
  await prisma.receita.deleteMany();
  await prisma.insumo.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}
