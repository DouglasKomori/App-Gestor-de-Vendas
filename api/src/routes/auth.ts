import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';

import { gerarToken } from '../auth/token';
import { Prisma } from '../generated/prisma/client';
import { autenticar, userIdAutenticado } from '../http/autenticar';
import { AppError } from '../http/errors';
import { prisma } from '../lib/prisma';

const CUSTO_BCRYPT = 10;

// Comparado quando o email não existe, para o login demorar o mesmo tempo nos dois casos.
const HASH_FALSO = bcrypt.hashSync('senha-de-um-usuario-inexistente', CUSTO_BCRYPT);

const emailSchema = z
  .string({ error: 'Informe o email.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Email inválido.').max(191, 'Email muito longo.'));

const cadastroSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(1, 'Informe o nome.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  email: emailSchema,
  senha: z
    .string({ error: 'Informe a senha.' })
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    // O bcrypt ignora o que passa de 72 bytes.
    .max(72, 'A senha deve ter no máximo 72 caracteres.'),
});

const loginSchema = z.object({
  email: emailSchema,
  senha: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.'),
});

function emailJaCadastrado(): AppError {
  return new AppError(409, 'EMAIL_JA_CADASTRADO', 'Já existe uma conta com este email.');
}

function credenciaisInvalidas(): AppError {
  return new AppError(401, 'CREDENCIAIS_INVALIDAS', 'Email ou senha inválidos');
}

const camposPublicos = { id: true, nome: true, email: true } as const;

export const authRouter = Router();

authRouter.post('/auth/register', async (req, res) => {
  const { nome, email, senha } = cadastroSchema.parse(req.body);

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw emailJaCadastrado();
  }

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);

  try {
    const user = await prisma.user.create({
      data: { nome, email, senhaHash },
      select: camposPublicos,
    });
    res.status(201).json({ token: gerarToken(user.id), user });
  } catch (error) {
    // Dois cadastros simultâneos com o mesmo email: o índice único do banco barra o segundo.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw emailJaCadastrado();
    }
    throw error;
  }
});

authRouter.post('/auth/login', async (req, res) => {
  const { email, senha } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const senhaConfere = await bcrypt.compare(senha, user?.senhaHash ?? HASH_FALSO);

  if (!user || !senhaConfere) {
    throw credenciaisInvalidas();
  }

  res.json({
    token: gerarToken(user.id),
    user: { id: user.id, nome: user.nome, email: user.email },
  });
});

authRouter.get('/auth/me', autenticar, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: userIdAutenticado(req) },
    select: camposPublicos,
  });

  if (!user) {
    throw new AppError(401, 'TOKEN_INVALIDO', 'Sessão inválida. Faça login novamente.');
  }

  res.json({ user });
});
