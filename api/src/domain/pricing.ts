/**
 * Regras de precificação. Módulo puro: não depende de Express nem de Prisma.
 *
 * Todo cálculo usa decimal.js. Nada aqui é arredondado, exceto em `arredondarMoeda`,
 * que serve apenas para a exibição final.
 */
import { Decimal } from 'decimal.js';

// Instância própria para não depender (nem alterar) a configuração global do decimal.js.
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type Unidade = 'G' | 'KG' | 'ML' | 'L' | 'UN';
export type UnidadeBase = 'G' | 'ML' | 'UN';
export type Dimensao = 'MASSA' | 'VOLUME' | 'UNIDADE';

/** Valor decimal de entrada: texto ("5.49"), número ou Decimal. */
export type ValorDecimal = Decimal.Value;

export const MARGEM_MINIMA_PERCENTUAL = 0;
export const MARGEM_MAXIMA_PERCENTUAL = 95;

const UNIDADES: Record<Unidade, { dimensao: Dimensao; base: UnidadeBase; fator: number; rotulo: string }> = {
  G: { dimensao: 'MASSA', base: 'G', fator: 1, rotulo: 'g' },
  KG: { dimensao: 'MASSA', base: 'G', fator: 1000, rotulo: 'kg' },
  ML: { dimensao: 'VOLUME', base: 'ML', fator: 1, rotulo: 'ml' },
  L: { dimensao: 'VOLUME', base: 'ML', fator: 1000, rotulo: 'L' },
  UN: { dimensao: 'UNIDADE', base: 'UN', fator: 1, rotulo: 'un' },
};

const NOME_DIMENSAO: Record<Dimensao, string> = {
  MASSA: 'massa',
  VOLUME: 'volume',
  UNIDADE: 'unidade',
};

export type PricingErrorCode = 'VALOR_INVALIDO' | 'UNIDADES_INCOMPATIVEIS';

export interface PricingErrorDetalhes {
  /** Campo que causou o erro, ex.: "margemDesejadaPercentual". */
  campo?: string;
  /** Posição do item na lista de itens da receita (começa em 0). */
  indiceItem?: number;
}

/** Erro de regra de negócio do cálculo, com mensagem em português. */
export class PricingError extends Error {
  readonly code: PricingErrorCode;
  readonly detalhes: PricingErrorDetalhes;

  constructor(code: PricingErrorCode, message: string, detalhes: PricingErrorDetalhes = {}) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
    this.detalhes = detalhes;
  }
}

export interface InsumoParaCalculo {
  unidadeCompra: Unidade;
  quantidadeEmbalagem: ValorDecimal;
  precoEmbalagem: ValorDecimal;
  /** Percentual aproveitado depois das perdas (casca, osso). 100 = sem perda. */
  aproveitamentoPercentual: ValorDecimal;
}

export interface ItemParaCalculo {
  quantidade: ValorDecimal;
  unidade: Unidade;
  insumo: InsumoParaCalculo;
}

export interface ReceitaParaCalculo {
  rendimentoPorcoes: number;
  custosExtrasPercentual: ValorDecimal;
  margemDesejadaPercentual: ValorDecimal;
  itens: ItemParaCalculo[];
}

export interface CalculoItem {
  /** Quantidade usada, convertida para a unidade base (g, ml ou un). */
  quantidadeBase: Decimal;
  unidadeBase: UnidadeBase;
  custoPorUnidadeBase: Decimal;
  custo: Decimal;
}

export interface CalculoReceita {
  /** Um resultado por item, na mesma ordem da entrada. */
  itens: CalculoItem[];
  custoIngredientes: Decimal;
  custoExtras: Decimal;
  custoTotal: Decimal;
  custoPorPorcao: Decimal;
  /** Preço que garante a margem desejada sobre o preço de venda. */
  precoSugeridoPorPorcao: Decimal;
  lucroPorPorcao: Decimal;
  /** Comparação didática: o que aconteceria aplicando o mesmo percentual como markup sobre o custo. */
  markup: {
    precoPorPorcao: Decimal;
    lucroPorPorcao: Decimal;
    /** Margem sobre o preço de venda que o markup realmente entrega. */
    margemRealPercentual: Decimal;
  };
}

function decimalValido(valor: ValorDecimal, campo: string, nome: string): Decimal {
  let decimal: Decimal;
  try {
    decimal = new D(valor);
  } catch {
    throw new PricingError('VALOR_INVALIDO', `${nome} deve ser um número.`, { campo });
  }
  if (!decimal.isFinite()) {
    throw new PricingError('VALOR_INVALIDO', `${nome} deve ser um número.`, { campo });
  }
  return decimal;
}

function decimalPositivo(valor: ValorDecimal, campo: string, nome: string): Decimal {
  const decimal = decimalValido(valor, campo, nome);
  if (decimal.lte(0)) {
    throw new PricingError('VALOR_INVALIDO', `${nome} deve ser maior que zero.`, { campo });
  }
  return decimal;
}

function decimalNaoNegativo(valor: ValorDecimal, campo: string, nome: string): Decimal {
  const decimal = decimalValido(valor, campo, nome);
  if (decimal.lt(0)) {
    throw new PricingError('VALOR_INVALIDO', `${nome} não pode ser negativo.`, { campo });
  }
  return decimal;
}

export function dimensaoDe(unidade: Unidade): Dimensao {
  return UNIDADES[unidade].dimensao;
}

export function unidadeBaseDe(unidade: Unidade): UnidadeBase {
  return UNIDADES[unidade].base;
}

export function saoCompativeis(a: Unidade, b: Unidade): boolean {
  return dimensaoDe(a) === dimensaoDe(b);
}

/** Unidades que podem ser usadas em uma receita para um insumo comprado na unidade informada. */
export function unidadesCompativeis(unidade: Unidade): Unidade[] {
  return (Object.keys(UNIDADES) as Unidade[]).filter((outra) => saoCompativeis(unidade, outra));
}

/** Converte para a unidade base: massa em g, volume em ml, unidade em un. */
export function converterParaUnidadeBase(quantidade: ValorDecimal, unidade: Unidade): Decimal {
  return decimalValido(quantidade, 'quantidade', 'A quantidade').times(UNIDADES[unidade].fator);
}

/** Quantidade realmente aproveitada de uma embalagem, na unidade base. */
function quantidadeAproveitadaDaEmbalagem(insumo: InsumoParaCalculo): Decimal {
  const quantidade = decimalPositivo(
    insumo.quantidadeEmbalagem,
    'quantidadeEmbalagem',
    'A quantidade da embalagem',
  );
  const aproveitamento = decimalPositivo(
    insumo.aproveitamentoPercentual,
    'aproveitamentoPercentual',
    'O aproveitamento',
  );
  if (aproveitamento.gt(100)) {
    throw new PricingError('VALOR_INVALIDO', 'O aproveitamento não pode passar de 100%.', {
      campo: 'aproveitamentoPercentual',
    });
  }
  return quantidade.times(UNIDADES[insumo.unidadeCompra].fator).times(aproveitamento).div(100);
}

function precoDaEmbalagem(insumo: InsumoParaCalculo): Decimal {
  return decimalNaoNegativo(insumo.precoEmbalagem, 'precoEmbalagem', 'O preço da embalagem');
}

/** Preço da embalagem / (quantidade da embalagem em unidade base × aproveitamento/100). */
export function custoPorUnidadeBase(insumo: InsumoParaCalculo): Decimal {
  return precoDaEmbalagem(insumo).div(quantidadeAproveitadaDaEmbalagem(insumo));
}

/** Custo de um item da receita: quantidade usada (em unidade base) × custo por unidade base. */
export function calcularItem(item: ItemParaCalculo): CalculoItem {
  const { insumo } = item;

  if (!saoCompativeis(item.unidade, insumo.unidadeCompra)) {
    const usada = UNIDADES[item.unidade];
    const comprada = UNIDADES[insumo.unidadeCompra];
    throw new PricingError(
      'UNIDADES_INCOMPATIVEIS',
      `Não é possível usar "${usada.rotulo}" (${NOME_DIMENSAO[usada.dimensao]}) em um insumo comprado em ` +
        `"${comprada.rotulo}" (${NOME_DIMENSAO[comprada.dimensao]}).`,
      { campo: 'unidade' },
    );
  }

  const quantidade = decimalPositivo(item.quantidade, 'quantidade', 'A quantidade do item');
  const quantidadeBase = quantidade.times(UNIDADES[item.unidade].fator);
  const preco = precoDaEmbalagem(insumo);
  const aproveitado = quantidadeAproveitadaDaEmbalagem(insumo);

  return {
    quantidadeBase,
    unidadeBase: unidadeBaseDe(item.unidade),
    custoPorUnidadeBase: preco.div(aproveitado),
    // Multiplica antes de dividir: o resultado é o mesmo de quantidade × custo por unidade base,
    // mas sem perder precisão em divisões que geram dízima.
    custo: quantidadeBase.times(preco).div(aproveitado),
  };
}

export function calcularReceita(receita: ReceitaParaCalculo): CalculoReceita {
  if (!Number.isInteger(receita.rendimentoPorcoes) || receita.rendimentoPorcoes < 1) {
    throw new PricingError(
      'VALOR_INVALIDO',
      'O rendimento deve ser um número inteiro de porções, a partir de 1.',
      { campo: 'rendimentoPorcoes' },
    );
  }

  const custosExtras = decimalNaoNegativo(
    receita.custosExtrasPercentual,
    'custosExtrasPercentual',
    'O percentual de custos extras',
  );

  const margem = decimalValido(
    receita.margemDesejadaPercentual,
    'margemDesejadaPercentual',
    'A margem desejada',
  );
  if (margem.lt(MARGEM_MINIMA_PERCENTUAL) || margem.gt(MARGEM_MAXIMA_PERCENTUAL)) {
    throw new PricingError(
      'VALOR_INVALIDO',
      `A margem desejada deve ficar entre ${MARGEM_MINIMA_PERCENTUAL}% e ${MARGEM_MAXIMA_PERCENTUAL}%.`,
      { campo: 'margemDesejadaPercentual' },
    );
  }

  const itens = receita.itens.map((item, indiceItem) => {
    try {
      return calcularItem(item);
    } catch (error) {
      if (error instanceof PricingError) {
        throw new PricingError(error.code, error.message, { ...error.detalhes, indiceItem });
      }
      throw error;
    }
  });

  const custoIngredientes = itens.reduce((soma, item) => soma.plus(item.custo), new D(0));
  const custoExtras = custoIngredientes.times(custosExtras).div(100);
  const custoTotal = custoIngredientes.plus(custoExtras);
  const custoPorPorcao = custoTotal.div(receita.rendimentoPorcoes);

  // Margem sobre o preço de venda: preço = custo / (1 − margem/100).
  const precoSugeridoPorPorcao = custoPorPorcao.div(new D(1).minus(margem.div(100)));
  const lucroPorPorcao = precoSugeridoPorPorcao.minus(custoPorPorcao);

  // Markup simples: preço = custo × (1 + percentual/100). Parece igual, mas rende menos.
  const precoMarkup = custoPorPorcao.times(new D(1).plus(margem.div(100)));
  const lucroMarkup = precoMarkup.minus(custoPorPorcao);
  const margemRealMarkup = precoMarkup.isZero() ? new D(0) : lucroMarkup.div(precoMarkup).times(100);

  return {
    itens,
    custoIngredientes,
    custoExtras,
    custoTotal,
    custoPorPorcao,
    precoSugeridoPorPorcao,
    lucroPorPorcao,
    markup: {
      precoPorPorcao: precoMarkup,
      lucroPorPorcao: lucroMarkup,
      margemRealPercentual: margemRealMarkup,
    },
  };
}

/** Arredonda para 2 casas (meio para cima). Usar somente na exibição final. */
export function arredondarMoeda(valor: ValorDecimal): string {
  return new D(valor).toFixed(2, Decimal.ROUND_HALF_UP);
}
