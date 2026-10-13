import { Router, type Request } from 'express';
import { z } from 'zod';

import { saoCompativeis } from '../domain/pricing';
import type { Insumo } from '../generated/prisma/client';
import { autenticar, userIdAutenticado } from '../http/autenticar';
import { AppError } from '../http/errors';
import { decimalSchema, lerId, unidadeSchema } from '../http/validacao';
import { prisma } from '../lib/prisma';

const insumoSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome do insumo.' })
    .trim()
    .min(1, 'Informe o nome do insumo.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  unidadeCompra: unidadeSchema,
  quantidadeEmbalagem: decimalSchema({
    nome: 'A quantidade da embalagem',
    positivo: true,
    maximo: 999999,
    casas: 3,
  }),
  precoEmbalagem: decimalSchema({ nome: 'O preço da embalagem', maximo: 999999.99, casas: 2 }),
  aproveitamentoPercentual: decimalSchema({
    nome: 'O aproveitamento',
    positivo: true,
    maximo: 100,
    casas: 2,
  }).default('100'),
});

function paraJson(insumo: Insumo) {
  return {
    id: insumo.id,
    nome: insumo.nome,
    unidadeCompra: insumo.unidadeCompra,
    quantidadeEmbalagem: insumo.quantidadeEmbalagem.toString(),
    precoEmbalagem: insumo.precoEmbalagem.toFixed(2),
    aproveitamentoPercentual: insumo.aproveitamentoPercentual.toString(),
    createdAt: insumo.createdAt,
    updatedAt: insumo.updatedAt,
  };
}

function naoEncontrado(): AppError {
  return new AppError(404, 'INSUMO_NAO_ENCONTRADO', 'Insumo não encontrado.');
}

/** Busca o insumo da URL, garantindo que ele pertence ao usuário logado. */
async function buscarInsumoDoUsuario(req: Request): Promise<Insumo> {
  const id = lerId(req.params.id);
  const insumo =
    id === null
      ? null
      : await prisma.insumo.findFirst({ where: { id, userId: userIdAutenticado(req) } });

  if (!insumo) {
    throw naoEncontrado();
  }
  return insumo;
}

/** Receitas do mesmo usuário que têm o insumo entre os itens. */
function receitasQueUsam(insumo: Insumo) {
  return prisma.receita.findMany({
    where: { userId: insumo.userId, itens: { some: { insumoId: insumo.id } } },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });
}

function listarNomes(receitas: { nome: string }[]): string {
  return receitas.map((receita) => `"${receita.nome}"`).join(', ');
}

export const insumosRouter = Router();

insumosRouter.use('/insumos', autenticar);

insumosRouter.get('/insumos', async (req, res) => {
  const insumos = await prisma.insumo.findMany({
    where: { userId: userIdAutenticado(req) },
    orderBy: { nome: 'asc' },
  });
  res.json({ insumos: insumos.map(paraJson) });
});

insumosRouter.post('/insumos', async (req, res) => {
  const dados = insumoSchema.parse(req.body);
  const insumo = await prisma.insumo.create({
    data: { ...dados, userId: userIdAutenticado(req) },
  });
  res.status(201).json({ insumo: paraJson(insumo) });
});

insumosRouter.get('/insumos/:id', async (req, res) => {
  res.json({ insumo: paraJson(await buscarInsumoDoUsuario(req)) });
});

insumosRouter.put('/insumos/:id', async (req, res) => {
  const atual = await buscarInsumoDoUsuario(req);
  const dados = insumoSchema.parse(req.body);

  // Trocar massa por volume (ou vice-versa) quebraria as receitas que já usam o insumo.
  if (!saoCompativeis(dados.unidadeCompra, atual.unidadeCompra)) {
    const receitas = await receitasQueUsam(atual);
    if (receitas.length > 0) {
      throw new AppError(
        409,
        'UNIDADE_EM_USO',
        `Não é possível trocar o tipo de unidade deste insumo, porque ele já é usado em: ${listarNomes(receitas)}.`,
        { receitas },
      );
    }
  }

  const insumo = await prisma.insumo.update({ where: { id: atual.id }, data: dados });
  res.json({ insumo: paraJson(insumo) });
});

insumosRouter.delete('/insumos/:id', async (req, res) => {
  const insumo = await buscarInsumoDoUsuario(req);

  const receitas = await receitasQueUsam(insumo);
  if (receitas.length > 0) {
    throw new AppError(
      409,
      'INSUMO_EM_USO',
      `Não é possível excluir "${insumo.nome}", porque ele é usado em: ${listarNomes(receitas)}. ` +
        'Remova o insumo dessas receitas antes de excluir.',
      { receitas },
    );
  }

  await prisma.insumo.delete({ where: { id: insumo.id } });
  res.status(204).end();
});
