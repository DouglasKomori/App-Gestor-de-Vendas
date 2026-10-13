import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { app } from '../app';

/** Cada teste usa emails próprios, então os testes não interferem uns nos outros. */
export function emailUnico(): string {
  return `teste-${randomUUID()}@exemplo.com`;
}

export interface UsuarioDeTeste {
  id: number;
  token: string;
  /** Cabeçalho pronto para `.set(usuario.auth)`. */
  auth: { Authorization: string };
}

export async function criarUsuario(nome = 'Maria'): Promise<UsuarioDeTeste> {
  const resposta = await request(app)
    .post('/auth/register')
    .send({ nome, email: emailUnico(), senha: 'senha-segura-123' });

  if (resposta.status !== 201) {
    throw new Error(`Falha ao criar usuário de teste: ${JSON.stringify(resposta.body)}`);
  }

  const token: string = resposta.body.token;
  return { id: resposta.body.user.id, token, auth: { Authorization: `Bearer ${token}` } };
}
