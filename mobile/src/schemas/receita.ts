import { z } from 'zod';

import { UNIDADES, type Unidade } from '@/lib/unidades';
import { decimalDigitado, decimalDigitadoOpcional } from '@/schemas/decimal';

// As mesmas regras são validadas de novo na API (api/src/routes/receitas.ts).

const rendimento = z
  .string()
  .trim()
  .min(1, 'Digite quantas porções a receita rende.')
  .regex(/^\d+$/, 'Digite um número inteiro, como 12.')
  .transform(Number)
  .pipe(
    z
      .number()
      .min(1, 'A receita deve render pelo menos 1 porção.')
      .max(100000, 'O máximo é 100000 porções.'),
  );

const margem = decimalDigitado({
  obrigatorio: 'Digite a margem desejada.',
  maximo: 95,
  casas: 2,
});

const custosExtras = decimalDigitado({
  obrigatorio: 'Digite os custos extras. Se não houver, use 0.',
  maximo: 1000,
  casas: 2,
});

const quantidade = decimalDigitado({
  obrigatorio: 'Digite a quantidade.',
  positivo: true,
  maximo: 999999,
  casas: 3,
});

const tempoPreparo = z
  .string()
  .trim()
  .regex(/^\d*$/, 'Digite os minutos só com números, como 90.')
  .transform(Number)
  .pipe(z.number().max(100000, 'O máximo é 100000 minutos.'));

const valorHora = decimalDigitadoOpcional({ maximo: 9999.99, casas: 2 }).transform((v) => v ?? '0');
const taxaVenda = decimalDigitadoOpcional({ maximo: 95, casas: 2 }).transform((v) => v ?? '0');
const precoPraticado = decimalDigitadoOpcional({ positivo: true, maximo: 999999.99, casas: 2 });

const item = z.object({
  insumoId: z.number(),
  quantidade,
  unidade: z.enum(UNIDADES),
  medidaCaseiraId: z.number().nullable(),
});

export const receitaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Digite o nome da receita.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  rendimentoPorcoes: rendimento,
  margemDesejadaPercentual: margem,
  custosExtrasPercentual: custosExtras,
  tempoPreparoMinutos: tempoPreparo,
  valorHoraTrabalho: valorHora,
  taxaVendaPercentual: taxaVenda,
  precoVendaPraticado: precoPraticado,
  observacoes: z.string().trim().max(2000, 'As observações devem ter no máximo 2000 caracteres.'),
  itens: z.array(item).min(1, 'Adicione pelo menos um insumo.'),
});

/** O que o usuário digita (quase tudo texto). */
export type CamposDaReceita = z.input<typeof receitaSchema>;
/** O que é enviado à API. */
export type DadosDaReceita = z.output<typeof receitaSchema>;

/** Corpo de POST /receitas/calcular. */
export interface DadosParaCalculo {
  rendimentoPorcoes: number;
  margemDesejadaPercentual: string;
  custosExtrasPercentual: string;
  tempoPreparoMinutos: number;
  valorHoraTrabalho: string;
  taxaVendaPercentual: string;
  precoVendaPraticado: string | null;
  itens: { insumoId: number; quantidade: string; unidade: Unidade; medidaCaseiraId: number | null }[];
}

type CamposParciais = {
  rendimentoPorcoes?: string;
  margemDesejadaPercentual?: string;
  custosExtrasPercentual?: string;
  tempoPreparoMinutos?: string;
  valorHoraTrabalho?: string;
  taxaVendaPercentual?: string;
  precoVendaPraticado?: string;
  itens?: (
    | { insumoId?: number; quantidade?: string; unidade?: Unidade; medidaCaseiraId?: number | null }
    | undefined
  )[];
};

/**
 * Monta o pedido de cálculo a partir do formulário ainda em edição.
 *
 * Devolve `null` enquanto algum campo geral da receita não for válido. Itens ainda
 * sem quantidade válida ficam de fora; `indices` diz a qual item do formulário cada item
 * enviado corresponde.
 */
export function prepararCalculo(
  campos: CamposParciais,
): { dados: DadosParaCalculo; indices: number[] } | null {
  const rendimentoLido = rendimento.safeParse(campos.rendimentoPorcoes ?? '');
  const margemLida = margem.safeParse(campos.margemDesejadaPercentual ?? '');
  const extrasLidos = custosExtras.safeParse(campos.custosExtrasPercentual ?? '');
  const tempoLido = tempoPreparo.safeParse(campos.tempoPreparoMinutos ?? '');
  const valorHoraLido = valorHora.safeParse(campos.valorHoraTrabalho ?? '');
  const taxaLida = taxaVenda.safeParse(campos.taxaVendaPercentual ?? '');
  const precoLido = precoPraticado.safeParse(campos.precoVendaPraticado ?? '');
  if (
    !rendimentoLido.success ||
    !margemLida.success ||
    !extrasLidos.success ||
    !tempoLido.success ||
    !valorHoraLido.success ||
    !taxaLida.success ||
    !precoLido.success
  ) {
    return null;
  }

  const itens: DadosParaCalculo['itens'] = [];
  const indices: number[] = [];
  (campos.itens ?? []).forEach((campo, indice) => {
    const quantidadeLida = quantidade.safeParse(campo?.quantidade ?? '');
    if (quantidadeLida.success && campo?.insumoId && campo.unidade) {
      itens.push({
        insumoId: campo.insumoId,
        quantidade: quantidadeLida.data,
        unidade: campo.unidade,
        medidaCaseiraId: campo.medidaCaseiraId ?? null,
      });
      indices.push(indice);
    }
  });

  return {
    dados: {
      rendimentoPorcoes: rendimentoLido.data,
      margemDesejadaPercentual: margemLida.data,
      custosExtrasPercentual: extrasLidos.data,
      tempoPreparoMinutos: tempoLido.data,
      valorHoraTrabalho: valorHoraLido.data,
      taxaVendaPercentual: taxaLida.data,
      precoVendaPraticado: precoLido.data,
      itens,
    },
    indices,
  };
}

// Formatos devolvidos pela API. Valores em reais já chegam arredondados, como texto.

export interface ResultadoPraticado {
  precoPorPorcao: string;
  taxaVendaPorPorcao: string;
  lucroPorPorcao: string;
  lucroPorReceita: string;
  margemRealPercentual: string;
  situacao: 'PREJUIZO' | 'ABAIXO_DA_META' | 'NA_META';
}

export interface AlertaDaReceita {
  codigo: string;
  mensagem: string;
  /** Posição do item enviado no cálculo, quando o alerta é sobre um item. */
  indiceItem?: number;
}

export interface Calculo {
  itens: { insumoId: number; custo: string }[];
  custoIngredientes: string;
  custoExtras: string;
  custoMaoDeObra: string;
  custoTotal: string;
  custoPorPorcao: string;
  precoSugeridoPorPorcao: string;
  taxaVendaPorPorcao: string;
  lucroPorPorcao: string;
  praticado: ResultadoPraticado | null;
  alertas: AlertaDaReceita[];
  markup: {
    precoPorPorcao: string;
    lucroPorPorcao: string;
    margemRealPercentual: string;
  };
}

export interface ReceitaResumo {
  id: number;
  nome: string;
  rendimentoPorcoes: number;
  custoPorPorcao: string;
  precoSugeridoPorPorcao: string;
  praticado: ResultadoPraticado | null;
  updatedAt: string;
}

export interface Receita {
  id: number;
  nome: string;
  rendimentoPorcoes: number;
  custosExtrasPercentual: string;
  margemDesejadaPercentual: string;
  tempoPreparoMinutos: number;
  valorHoraTrabalho: string;
  taxaVendaPercentual: string;
  precoVendaPraticado: string | null;
  observacoes: string | null;
  itens: {
    id: number;
    insumoId: number;
    insumoNome: string;
    insumoUnidadeCompra: Unidade;
    quantidade: string;
    unidade: Unidade;
    medidaCaseiraId: number | null;
    medidaNome: string | null;
    custo: string;
  }[];
  calculo: Calculo;
  createdAt: string;
  updatedAt: string;
}
