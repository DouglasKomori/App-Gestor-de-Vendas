import { randomUUID } from 'node:crypto';

import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';

const SENHA = 'senha-segura-123';

/** Cada teste usa um email próprio, então os testes não interferem uns nos outros. */
function emailUnico(): string {
  return `teste-${randomUUID()}@exemplo.com`;
}

async function cadastrar(dados: { nome?: string; email?: string; senha?: string } = {}) {
  const email = dados.email ?? emailUnico();
  const resposta = await request(app)
    .post('/auth/register')
    .send({ nome: dados.nome ?? 'Maria', email, senha: dados.senha ?? SENHA });
  return { resposta, email };
}

function tokenAssinado(
  userId: number,
  opcoes: { segredo?: string; expiresIn?: jwt.SignOptions['expiresIn'] } = {},
): string {
  return jwt.sign({}, opcoes.segredo ?? process.env.JWT_SECRET!, {
    subject: String(userId),
    expiresIn: opcoes.expiresIn ?? '1h',
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('cria a conta e devolve o token e os dados do usuário', async () => {
    const { resposta, email } = await cadastrar({ nome: 'Maria da Silva' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.token).toEqual(expect.any(String));
    expect(resposta.body.user).toEqual({
      id: expect.any(Number),
      nome: 'Maria da Silva',
      email,
    });
  });

  it('guarda a senha como hash, nunca em texto puro', async () => {
    const { resposta, email } = await cadastrar();

    expect(JSON.stringify(resposta.body)).not.toContain(SENHA);
    expect(resposta.body.user).not.toHaveProperty('senhaHash');

    const salvo = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(salvo.senhaHash).not.toBe(SENHA);
    expect(salvo.senhaHash).toMatch(/^\$2[aby]\$/);
  });

  it('normaliza o email (sem espaços e em minúsculas) e o nome', async () => {
    const email = emailUnico();
    const { resposta } = await cadastrar({
      nome: '  João  ',
      email: `  ${email.toUpperCase()}  `,
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.user.email).toBe(email);
    expect(resposta.body.user.nome).toBe('João');
  });

  it('emite um token que expira em 7 dias', async () => {
    const { resposta } = await cadastrar();
    const payload = jwt.decode(resposta.body.token) as jwt.JwtPayload;

    expect(payload.sub).toBe(String(resposta.body.user.id));
    expect(payload.exp! - payload.iat!).toBe(7 * 24 * 60 * 60);
  });

  it('recusa email já cadastrado com 409', async () => {
    const { email } = await cadastrar();
    const { resposta } = await cadastrar({ email });

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({
      error: { code: 'EMAIL_JA_CADASTRADO', message: 'Já existe uma conta com este email.' },
    });
  });

  it('considera o mesmo email com maiúsculas como já cadastrado', async () => {
    const { email } = await cadastrar();
    const { resposta } = await cadastrar({ email: email.toUpperCase() });

    expect(resposta.status).toBe(409);
  });

  it.each([
    ['senha com menos de 8 caracteres', { senha: '1234567' }, 'senha', 'A senha deve ter pelo menos 8 caracteres.'],
    ['email inválido', { email: 'nao-e-um-email' }, 'email', 'Email inválido.'],
    ['nome em branco', { nome: '   ' }, 'nome', 'Informe o nome.'],
  ])('recusa %s com 400', async (_caso, dados, campo, mensagem) => {
    const { resposta } = await cadastrar(dados);

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.code).toBe('DADOS_INVALIDOS');
    expect(resposta.body.error.details).toEqual([{ campo, mensagem }]);
  });

  it('recusa corpo vazio apontando todos os campos obrigatórios', async () => {
    const resposta = await request(app).post('/auth/register').send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.details).toEqual([
      { campo: 'nome', mensagem: 'Informe o nome.' },
      { campo: 'email', mensagem: 'Informe o email.' },
      { campo: 'senha', mensagem: 'Informe a senha.' },
    ]);
  });
});

describe('POST /auth/login', () => {
  it('entra com email e senha corretos', async () => {
    const { resposta: cadastro, email } = await cadastrar();
    const resposta = await request(app).post('/auth/login').send({ email, senha: SENHA });

    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toEqual(expect.any(String));
    expect(resposta.body.user).toEqual(cadastro.body.user);
  });

  it('normaliza o email digitado no login', async () => {
    const { email } = await cadastrar();
    const resposta = await request(app)
      .post('/auth/login')
      .send({ email: `  ${email.toUpperCase()} `, senha: SENHA });

    expect(resposta.status).toBe(200);
  });

  it('devolve a mesma resposta genérica para senha errada e para email inexistente', async () => {
    const { email } = await cadastrar();

    const senhaErrada = await request(app)
      .post('/auth/login')
      .send({ email, senha: 'senha-errada-123' });
    const emailInexistente = await request(app)
      .post('/auth/login')
      .send({ email: emailUnico(), senha: SENHA });

    expect(senhaErrada.status).toBe(401);
    expect(senhaErrada.body).toEqual({
      error: { code: 'CREDENCIAIS_INVALIDAS', message: 'Email ou senha inválidos' },
    });
    expect(emailInexistente.status).toBe(401);
    expect(emailInexistente.body).toEqual(senhaErrada.body);
  });

  it('recusa requisição sem senha com 400', async () => {
    const resposta = await request(app).post('/auth/login').send({ email: emailUnico() });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.details).toEqual([{ campo: 'senha', mensagem: 'Informe a senha.' }]);
  });
});

describe('GET /auth/me', () => {
  it('devolve o usuário dono do token', async () => {
    const { resposta: cadastro } = await cadastrar();
    const resposta = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${cadastro.body.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ user: cadastro.body.user });
  });

  it('aceita o token devolvido pelo login', async () => {
    const { email } = await cadastrar();
    const login = await request(app).post('/auth/login').send({ email, senha: SENHA });
    const resposta = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.user.email).toBe(email);
  });

  it('recusa requisição sem token', async () => {
    const resposta = await request(app).get('/auth/me');

    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('TOKEN_AUSENTE');
  });

  it.each(['Bearer', 'Basic abc123', 'token-sem-prefixo'])(
    'recusa cabeçalho Authorization malformado (%s)',
    async (cabecalho) => {
      const resposta = await request(app).get('/auth/me').set('Authorization', cabecalho);

      expect(resposta.status).toBe(401);
      expect(resposta.body.error.code).toBe('TOKEN_AUSENTE');
    },
  );

  it('recusa token inválido', async () => {
    const resposta = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer isto.nao.e-um-token');

    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('TOKEN_INVALIDO');
  });

  it('recusa token assinado com outro segredo', async () => {
    const { resposta: cadastro } = await cadastrar();
    const token = tokenAssinado(cadastro.body.user.id, { segredo: 'outro-segredo-qualquer' });
    const resposta = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('TOKEN_INVALIDO');
  });

  it('recusa token adulterado', async () => {
    const { resposta: cadastro } = await cadastrar();
    const [cabecalho, , assinatura] = (cadastro.body.token as string).split('.');
    const outroPayload = Buffer.from(JSON.stringify({ sub: '1' })).toString('base64url');
    const resposta = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${cabecalho}.${outroPayload}.${assinatura}`);

    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('TOKEN_INVALIDO');
  });

  it('recusa token expirado', async () => {
    const { resposta: cadastro } = await cadastrar();
    const token = tokenAssinado(cadastro.body.user.id, { expiresIn: -10 });
    const resposta = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual({
      error: { code: 'TOKEN_EXPIRADO', message: 'Sua sessão expirou. Faça login novamente.' },
    });
  });

  it('recusa token válido de um usuário que não existe mais', async () => {
    const { resposta: cadastro } = await cadastrar();
    await prisma.user.delete({ where: { id: cadastro.body.user.id } });
    const resposta = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${cadastro.body.token}`);

    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('TOKEN_INVALIDO');
  });
});
