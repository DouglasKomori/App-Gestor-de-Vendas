import { Router, type Request } from 'express';
import { z } from 'zod';

import {
  arredondarMoeda,
  calcularReceita,
  PricingError,
  type CalculoReceita,
  type ReceitaParaCalculo,
} from '../domain/pricing';
import type { Insumo, Prisma } from '../generated/prisma/client';
import { autenticar, userIdAutenticado } from '../http/autenticar';
import { AppError } from '../http/errors';
import { decimalSchema, lerId, unidadeSchema } from '../http/validacao';
import { prisma } from '../lib/prisma';

const itemSchema = z.object({
  insumoId: z
    .number({ error: 'Escolha um insumo.' })
    .int('Escolha um insumo.')
    .positive('Escolha um insumo.'),
  quantidade: decimalSchema({ nome: 'A quantidade', positivo: true, maximo: 999999, casas: 3 }),
  unidade: unidadeSchema,
});

/** Dados necessários para calcular uma receita, salva ou não. */
const calculoSchema = z.object({
  rendimentoPorcoes: z
    .number({ error: 'Informe quantas porções a receita rende.' })
    .int('O rendimento deve ser um número inteiro de porções.')
    .min(1, 'O rendimento deve ser de pelo menos 1 porção.')
    .max(100000, 'O rendimento deve ser de no máximo 100000 porções.'),
  custosExtrasPercentual: decimalSchema({
    nome: 'O percentual de custos extras',
    maximo: 1000,
    casas: 2,
  }).default('0'),
  margemDesejadaPercentual: decimalSchema({ nome: 'A margem desejada', maximo: 95, casas: 2 }),
  itens: z
    .array(itemSchema, { error: 'Informe os itens da receita.' })
    .max(100, 'A receita pode ter no máximo 100 itens.'),
});

const receitaSchema = calculoSchema.extend({
  nome: z
    .string({ error: 'Informe o nome da receita.' })
    .trim()
    .min(1, 'Informe o nome da receita.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  observacoes: z
    .string()
    .trim()
    .max(2000, 'As observações devem ter no máximo 2000 caracteres.')
    .nullish()
    .transform((texto) => texto || null),
  itens: z
    .array(itemSchema, { error: 'Informe os itens da receita.' })
    .min(1, 'Adicione pelo menos um insumo à receita.')
    .max(100, 'A receita pode ter no máximo 100 itens.'),
});

type ItemValidado = z.output<typeof itemSchema>;
type ItemComInsumo = ItemValidado & { insumo: Insumo };

const comItens = {
  itens: { include: { insumo: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.ReceitaInclude;

type ReceitaComItens = Prisma.ReceitaGetPayload<{ include: typeof comItens }>;

/** Tudo o que tem `toString()` e representa um decimal: texto validado ou Decimal do Prisma. */
type Decimalizavel = { toString(): string };

interface DadosParaCalculo {
  rendimentoPorcoes: number;
  custosExtrasPercentual: Decimalizavel;
  margemDesejadaPercentual: Decimalizavel;
  itens: { quantidade: Decimalizavel; unidade: ItemValidado['unidade']; insumo: Insumo }[];
}

function erroDeDados(campo: string, mensagem: string): AppError {
  return new AppError(400, 'DADOS_INVALIDOS', 'Os dados enviados são inválidos.', [
    { campo, mensagem },
  ]);
}

function naoEncontrada(): AppError {
  return new AppError(404, 'RECEITA_NAO_ENCONTRADA', 'Receita não encontrada.');
}

/** Converte os dados do banco/requisição para o formato do módulo de precificação. */
function paraCalculo(dados: DadosParaCalculo): ReceitaParaCalculo {
  return {
    rendimentoPorcoes: dados.rendimentoPorcoes,
    custosExtrasPercentual: dados.custosExtrasPercentual.toString(),
    margemDesejadaPercentual: dados.margemDesejadaPercentual.toString(),
    itens: dados.itens.map((item) => ({
      quantidade: item.quantidade.toString(),
      unidade: item.unidade,
      insumo: {
        unidadeCompra: item.insumo.unidadeCompra,
        quantidadeEmbalagem: item.insumo.quantidadeEmbalagem.toString(),
        precoEmbalagem: item.insumo.precoEmbalagem.toString(),
        aproveitamentoPercentual: item.insumo.aproveitamentoPercentual.toString(),
      },
    })),
  };
}

/**
 * Calcula a receita. Erro de regra (ex.: unidade incompatível) vira 400 apontando o item,
 * no mesmo formato dos erros de validação.
 */
function calcular(dados: DadosParaCalculo): CalculoReceita {
  try {
    return calcularReceita(paraCalculo(dados));
  } catch (error) {
    if (error instanceof PricingError) {
      const { campo = 'itens', indiceItem } = error.detalhes;
      throw erroDeDados(
        indiceItem === undefined ? campo : `itens.${indiceItem}.${campo}`,
        error.message,
      );
    }
    throw error;
  }
}

/**
 * Cálculo no formato da API. O módulo de precificação trabalha com precisão completa;
 * o arredondamento para 2 casas acontece só aqui, na saída, e o app apenas formata.
 */
function calculoParaJson(calculo: CalculoReceita, itens: { insumoId: number }[]) {
  return {
    itens: calculo.itens.map((item, indice) => ({
      insumoId: itens[indice].insumoId,
      custo: arredondarMoeda(item.custo),
    })),
    custoIngredientes: arredondarMoeda(calculo.custoIngredientes),
    custoExtras: arredondarMoeda(calculo.custoExtras),
    custoTotal: arredondarMoeda(calculo.custoTotal),
    custoPorPorcao: arredondarMoeda(calculo.custoPorPorcao),
    precoSugeridoPorPorcao: arredondarMoeda(calculo.precoSugeridoPorPorcao),
    lucroPorPorcao: arredondarMoeda(calculo.lucroPorPorcao),
    markup: {
      precoPorPorcao: arredondarMoeda(calculo.markup.precoPorPorcao),
      lucroPorPorcao: arredondarMoeda(calculo.markup.lucroPorPorcao),
      margemRealPercentual: arredondarMoeda(calculo.markup.margemRealPercentual),
    },
  };
}

function receitaParaJson(receita: ReceitaComItens) {
  // Os custos nunca são salvos: são recalculados a cada leitura com os preços atuais dos insumos.
  const calculo = calculoParaJson(calcular(receita), receita.itens);

  return {
    id: receita.id,
    nome: receita.nome,
    rendimentoPorcoes: receita.rendimentoPorcoes,
    custosExtrasPercentual: receita.custosExtrasPercentual.toString(),
    margemDesejadaPercentual: receita.margemDesejadaPercentual.toString(),
    observacoes: receita.observacoes,
    itens: receita.itens.map((item, indice) => ({
      id: item.id,
      insumoId: item.insumoId,
      insumoNome: item.insumo.nome,
      insumoUnidadeCompra: item.insumo.unidadeCompra,
      quantidade: item.quantidade.toString(),
      unidade: item.unidade,
      custo: calculo.itens[indice].custo,
    })),
    calculo,
    createdAt: receita.createdAt,
    updatedAt: receita.updatedAt,
  };
}

/** Troca cada `insumoId` pelo insumo do usuário. Insumo inexistente ou de outra pessoa é erro. */
async function carregarInsumos(userId: number, itens: ItemValidado[]): Promise<ItemComInsumo[]> {
  const ids = [...new Set(itens.map((item) => item.insumoId))];
  const insumos = await prisma.insumo.findMany({ where: { userId, id: { in: ids } } });
  const porId = new Map(insumos.map((insumo) => [insumo.id, insumo]));

  return itens.map((item, indice) => {
    const insumo = porId.get(item.insumoId);
    if (!insumo) {
      throw erroDeDados(`itens.${indice}.insumoId`, 'Insumo não encontrado.');
    }
    return { ...item, insumo };
  });
}

/** Busca a receita da URL, garantindo que ela pertence ao usuário logado. */
async function buscarReceitaDoUsuario(req: Request): Promise<ReceitaComItens> {
  const id = lerId(req.params.id);
  const receita =
    id === null
      ? null
      : await prisma.receita.findFirst({
          where: { id, userId: userIdAutenticado(req) },
          include: comItens,
        });

  if (!receita) {
    throw naoEncontrada();
  }
  return receita;
}

function itensParaSalvar(itens: ItemValidado[]) {
  return itens.map(({ insumoId, quantidade, unidade }) => ({ insumoId, quantidade, unidade }));
}

export const receitasRouter = Router();

receitasRouter.use('/receitas', autenticar);

receitasRouter.get('/receitas', async (req, res) => {
  const receitas = await prisma.receita.findMany({
    where: { userId: userIdAutenticado(req) },
    include: comItens,
    orderBy: { nome: 'asc' },
  });

  res.json({
    receitas: receitas.map((receita) => {
      const calculo = calculoParaJson(calcular(receita), receita.itens);
      return {
        id: receita.id,
        nome: receita.nome,
        rendimentoPorcoes: receita.rendimentoPorcoes,
        custoPorPorcao: calculo.custoPorPorcao,
        precoSugeridoPorPorcao: calculo.precoSugeridoPorPorcao,
        updatedAt: receita.updatedAt,
      };
    }),
  });
});

// Calcula uma receita ainda não salva. O app chama enquanto a pessoa edita a ficha técnica.
receitasRouter.post('/receitas/calcular', async (req, res) => {
  const dados = calculoSchema.parse(req.body);
  const itens = await carregarInsumos(userIdAutenticado(req), dados.itens);

  res.json({ calculo: calculoParaJson(calcular({ ...dados, itens }), itens) });
});

receitasRouter.post('/receitas', async (req, res) => {
  const userId = userIdAutenticado(req);
  const { itens, ...dados } = receitaSchema.parse(req.body);

  // Valida as unidades antes de gravar: receita que não calcula não é salva.
  calcular({ ...dados, itens: await carregarInsumos(userId, itens) });

  const receita = await prisma.receita.create({
    data: { ...dados, userId, itens: { create: itensParaSalvar(itens) } },
    include: comItens,
  });
  res.status(201).json({ receita: receitaParaJson(receita) });
});

receitasRouter.get('/receitas/:id', async (req, res) => {
  res.json({ receita: receitaParaJson(await buscarReceitaDoUsuario(req)) });
});

receitasRouter.put('/receitas/:id', async (req, res) => {
  const atual = await buscarReceitaDoUsuario(req);
  const { itens, ...dados } = receitaSchema.parse(req.body);

  calcular({ ...dados, itens: await carregarInsumos(atual.userId, itens) });

  // Os itens vêm completos no payload: troca todos de uma vez, na mesma transação.
  const receita = await prisma.receita.update({
    where: { id: atual.id },
    data: { ...dados, itens: { deleteMany: {}, create: itensParaSalvar(itens) } },
    include: comItens,
  });
  res.json({ receita: receitaParaJson(receita) });
});

receitasRouter.delete('/receitas/:id', async (req, res) => {
  const receita = await buscarReceitaDoUsuario(req);
  // Os itens são apagados junto pelo banco (ON DELETE CASCADE).
  await prisma.receita.delete({ where: { id: receita.id } });
  res.status(204).end();
});
