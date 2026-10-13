import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// Os testes de API usam um banco separado (mesmo servidor, nome terminado em "_test"),
// para nunca tocar nos dados de desenvolvimento.
const urlDoBancoDeTeste = new URL(
  process.env.DATABASE_URL ?? 'mysql://root:root@127.0.0.1:3306/gestor_vendas',
);
urlDoBancoDeTeste.pathname += '_test';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unidade',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.api.test.ts'],
        },
      },
      {
        test: {
          name: 'api',
          include: ['src/**/*.api.test.ts'],
          globalSetup: ['src/test/preparar-banco.ts'],
          env: {
            DATABASE_URL: urlDoBancoDeTeste.toString(),
            JWT_SECRET: 'segredo-usado-somente-nos-testes-automatizados',
          },
        },
      },
    ],
  },
});
