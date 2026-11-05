import { Router, type Request } from 'express';
import { z } from 'zod';

import { saoCompativeis } from '../domain/pricing';
import { Prisma, type Insumo, type MedidaCaseira } from '../generated/prisma/client';
import { autenticar, userIdAutenticado } from '../http/autenticar';
import { AppError } from '../http/errors';
import { decimalSchema, lerId, unidadeSchema } from '../http/validacao';
import { prisma } from '../lib/prisma';

const medidaSchema = z.object({
  id: z.number().int().positive().optional(),
  nome: z
    .string({ error: 'Informe o nome da medida.' })
    .trim()
    .min(1, 'Informe o nome da medida.')
    .max(60, 'O nome da medida deve ter no máximo 60 caracteres.'),
  quantidade: decimalSchema({ nome: 'O valor da medida', positivo: true, maximo: 999999, casas: 3 }),
  unidade: unidadeSchema,
});

const insumoSchema = z
  .object({
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
  // Sem o campo, as medidas atuais ficam como estão.
  medidas: z.array(medidaSchema).max(10, 'Cadastre no máximo 10 medidas por insumo.').optional(),
  })
  .superRefine((insumo, ctx) => {
    const nomes = new Set<string>();
    insumo.medidas?.forEach((medida, indice) => {
      if (!saoCompativeis(medida.unidade, insumo.unidadeCompra)) {
        ctx.addIssue({
          code: 'custom',
          path: ['medidas', indice, 'unidade'],
          message: 'A medida precisa usar o mesmo tipo de unidade da embalagem.',
        });
      }
      const nome = medida.nome.toLowerCase();
      if (nomes.has(nome)) {
        ctx.addIssue({
          code: 'custom',
          path: ['medidas', indice, 'nome'],
          message: 'Já existe uma medida com este nome.',
        });
      }
      nomes.add(nome);
    });
  });

type InsumoComMedidas = Insumo & { medidas: MedidaCaseira[] };

const comMedidas = { medidas: { orderBy: { id: 'asc' } } } as const;

function paraJson(insumo: InsumoComMedidas) {
  return {
    id: insumo.id,
    nome: insumo.nome,
    unidadeCompra: insumo.unidadeCompra,
    quantidadeEmbalagem: insumo.quantidadeEmbalagem.toString(),
    precoEmbalagem: insumo.precoEmbalagem.toFixed(2),
    aproveitamentoPercentual: insumo.aproveitamentoPercentual.toString(),
    medidas: insumo.medidas.map((medida) => ({
      id: medida.id,
      nome: medida.nome,
      quantidade: medida.quantidade.toString(),
      unidade: medida.unidade,
    })),
    createdAt: insumo.createdAt,
    updatedAt: insumo.updatedAt,
  };
}

function naoEncontrado(): AppError {
  return new AppError(404, 'INSUMO_NAO_ENCONTRADO', 'Insumo não encontrado.');
}

/** Busca o insumo da URL, garantindo que ele pertence ao usuário logado. */
async function buscarInsumoDoUsuario(req: Request): Promise<InsumoComMedidas> {
  const id = lerId(req.params.id);
  const insumo =
    id === null
      ? null
      : await prisma.insumo.findFirst({
          where: { id, userId: userIdAutenticado(req) },
          include: comMedidas,
        });

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

/**
 * Compara as medidas enviadas com as salvas. Medida usada em receita não pode sumir, porque a
 * receita perderia a quantidade; a alteração do valor é permitida e recalcula as receitas.
 */
async function sincronizarMedidas(atual: InsumoComMedidas, medidas: z.output<typeof medidaSchema>[]) {
  const idsAtuais = new Set(atual.medidas.map(({ id }) => id));

  medidas.forEach(({ id }, indice) => {
    if (id !== undefined && !idsAtuais.has(id)) {
      throw new AppError(400, 'DADOS_INVALIDOS', 'Os dados enviados são inválidos.', [
        { campo: `medidas.${indice}.id`, mensagem: 'Medida não encontrada.' },
      ]);
    }
  });

  const mantidas = new Set(medidas.map(({ id }) => id));
  const removidas = atual.medidas.filter(({ id }) => !mantidas.has(id));

  const emUso = await prisma.receita.findMany({
    where: { itens: { some: { medidaCaseiraId: { in: removidas.map(({ id }) => id) } } } },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });
  if (emUso.length > 0) {
    throw new AppError(
      409,
      'MEDIDA_EM_USO',
      `Não é possível remover essa medida, porque ela é usada em: ${listarNomes(emUso)}.`,
      { receitas: emUso },
    );
  }

  return {
    deleteMany: { id: { in: removidas.map(({ id }) => id) } },
    update: medidas.flatMap(({ id, nome, quantidade, unidade }) =>
      id === undefined ? [] : [{ where: { id }, data: { nome, quantidade, unidade } }],
    ),
    create: medidas
      .filter(({ id }) => id === undefined)
      .map(({ nome, quantidade, unidade }) => ({ nome, quantidade, unidade })),
  };
}

function listarNomes(receitas: { nome: string }[]): string {
  return receitas.map((receita) => `"${receita.nome}"`).join(', ');
}

export const insumosRouter = Router();

insumosRouter.use('/insumos', autenticar);

insumosRouter.get('/insumos', async (req, res) => {
  const insumos = await prisma.insumo.findMany({
    where: { userId: userIdAutenticado(req) },
    include: comMedidas,
    orderBy: { nome: 'asc' },
  });
  res.json({ insumos: insumos.map(paraJson) });
});

insumosRouter.post('/insumos', async (req, res) => {
  const { medidas = [], ...dados } = insumoSchema.parse(req.body);
  const insumo = await prisma.insumo.create({
    data: {
      ...dados,
      userId: userIdAutenticado(req),
      medidas: { create: medidas.map(({ nome, quantidade, unidade }) => ({ nome, quantidade, unidade })) },
    },
    include: comMedidas,
  });
  res.status(201).json({ insumo: paraJson(insumo) });
});

insumosRouter.get('/insumos/:id', async (req, res) => {
  res.json({ insumo: paraJson(await buscarInsumoDoUsuario(req)) });
});

insumosRouter.put('/insumos/:id', async (req, res) => {
  const atual = await buscarInsumoDoUsuario(req);
  const { medidas, ...dados } = insumoSchema.parse(req.body);
  const mudouTipoDeUnidade = !saoCompativeis(dados.unidadeCompra, atual.unidadeCompra);

  // Trocar massa por volume (ou vice-versa) quebraria as receitas que já usam o insumo.
  if (mudouTipoDeUnidade) {
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

  // Medidas de massa não servem para um insumo que passou a ser medido em volume.
  const novasMedidas = medidas ?? (mudouTipoDeUnidade ? [] : undefined);

  const data = {
    ...dados,
    medidas: novasMedidas && (await sincronizarMedidas(atual, novasMedidas)),
  };

  try {
    const insumo = await prisma.insumo.update({
      where: { id: atual.id },
      data,
      include: comMedidas,
    });
    res.json({ insumo: paraJson(insumo) });
  } catch (error) {
    // Duas medidas trocando de nome entre si: a primeira esbarra no nome que a outra ainda tem.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(
        409,
        'NOME_DE_MEDIDA_EM_USO',
        'Duas medidas ficaram com o mesmo nome durante a troca. Renomeie uma de cada vez.',
      );
    }
    throw error;
  }
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
