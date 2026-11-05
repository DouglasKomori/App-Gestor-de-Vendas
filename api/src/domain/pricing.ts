/**
 * Regras de precificação. Módulo puro: não depende de Express nem de Prisma.
 *
 * Todo cálculo usa decimal.js com precisão completa. Só duas coisas são arredondadas:
 * `arredondarMoeda`, para a exibição final, e o preço sugerido, que é um valor real de venda
 * e por isso sobe para o centavo seguinte (arredondar para baixo entregaria menos que a margem).
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

/** A partir daqui, o preço do insumo pode já não ser o do mercado. */
export const DIAS_PARA_PRECO_ANTIGO = 60;
/** Mais embalagens que isso em uma receita costuma ser unidade errada (kg no lugar de g). */
export const EMBALAGENS_POR_ITEM_SUSPEITAS = 20;

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
  /** Usados só nos alertas. */
  nome?: string;
  /** Última vez que a pessoa salvou o insumo, confirmando o preço. */
  precoConferidoEm?: Date;
}

/** Quanto vale uma medida caseira do insumo. Ex.: 1 colher de sopa de manteiga = 20 g. */
export interface MedidaParaCalculo {
  quantidade: ValorDecimal;
  unidade: Unidade;
}

export interface ItemParaCalculo {
  /** Com `medida`, é o número de medidas usadas (ex.: 2 colheres). */
  quantidade: ValorDecimal;
  unidade: Unidade;
  insumo: InsumoParaCalculo;
  medida?: MedidaParaCalculo | null;
}

export interface ReceitaParaCalculo {
  rendimentoPorcoes: number;
  custosExtrasPercentual: ValorDecimal;
  margemDesejadaPercentual: ValorDecimal;
  itens: ItemParaCalculo[];
  /** Tempo de trabalho na receita inteira. */
  tempoPreparoMinutos?: number;
  valorHoraTrabalho?: ValorDecimal;
  /** Taxa sobre o preço de venda (maquininha, aplicativo de entrega). */
  taxaVendaPercentual?: ValorDecimal;
  /** Preço que a pessoa cobra hoje por porção. */
  precoVendaPraticado?: ValorDecimal | null;
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
  custoMaoDeObra: Decimal;
  custoTotal: Decimal;
  custoPorPorcao: Decimal;
  /** Preço em centavos que garante a margem desejada, já cobrindo a taxa de venda. */
  precoSugeridoPorPorcao: Decimal;
  /** Quanto a taxa de venda leva de cada porção vendida pelo preço sugerido. */
  taxaVendaPorPorcao: Decimal;
  /** O que sobra depois do custo e da taxa de venda. */
  lucroPorPorcao: Decimal;
  /** Resultado com o preço cobrado hoje; `null` se a pessoa não informou. */
  praticado: ResultadoPraticado | null;
  /** Comparação didática: o que aconteceria aplicando o mesmo percentual como markup sobre o custo. */
  markup: {
    precoPorPorcao: Decimal;
    lucroPorPorcao: Decimal;
    /** Margem sobre o preço de venda que o markup realmente entrega. */
    margemRealPercentual: Decimal;
  };
}

export type SituacaoDoPreco = 'PREJUIZO' | 'ABAIXO_DA_META' | 'NA_META';

export interface ResultadoPraticado {
  precoPorPorcao: Decimal;
  taxaVendaPorPorcao: Decimal;
  lucroPorPorcao: Decimal;
  lucroPorReceita: Decimal;
  margemRealPercentual: Decimal;
  situacao: SituacaoDoPreco;
}

export type CodigoDoAlerta =
  | 'SEM_MAO_DE_OBRA'
  | 'INSUMO_SEM_PRECO'
  | 'CUSTO_MUITO_BAIXO'
  | 'QUANTIDADE_MUITO_ALTA'
  | 'PRECO_ANTIGO';

/** Algo que provavelmente deixa o custo errado, mas não impede o cálculo. */
export interface AlertaDaReceita {
  codigo: CodigoDoAlerta;
  mensagem: string;
  /** Posição do item na receita, quando o alerta é sobre um item. */
  indiceItem?: number;
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
  const { insumo, medida } = item;
  const unidadeUsada = medida?.unidade ?? item.unidade;

  if (!saoCompativeis(unidadeUsada, insumo.unidadeCompra)) {
    const usada = UNIDADES[unidadeUsada];
    const comprada = UNIDADES[insumo.unidadeCompra];
    throw new PricingError(
      'UNIDADES_INCOMPATIVEIS',
      `Não é possível usar "${usada.rotulo}" (${NOME_DIMENSAO[usada.dimensao]}) em um insumo comprado em ` +
        `"${comprada.rotulo}" (${NOME_DIMENSAO[comprada.dimensao]}).`,
      { campo: 'unidade' },
    );
  }

  const quantidade = decimalPositivo(item.quantidade, 'quantidade', 'A quantidade do item');
  const valorDaMedida = medida
    ? decimalPositivo(medida.quantidade, 'medidaCaseiraId', 'O valor da medida caseira')
    : new D(1);
  const quantidadeBase = quantidade.times(valorDaMedida).times(UNIDADES[unidadeUsada].fator);
  const preco = precoDaEmbalagem(insumo);
  const aproveitado = quantidadeAproveitadaDaEmbalagem(insumo);

  return {
    quantidadeBase,
    unidadeBase: unidadeBaseDe(unidadeUsada),
    custoPorUnidadeBase: preco.div(aproveitado),
    // Multiplica antes de dividir: o resultado é o mesmo de quantidade × custo por unidade base,
    // mas sem perder precisão em divisões que geram dízima.
    custo: quantidadeBase.times(preco).div(aproveitado),
  };
}

/** Sobe para o centavo seguinte. Corta antes o ruído de dízimas, para 2,00 não virar 2,01. */
function precoEmCentavos(valor: Decimal): Decimal {
  return valor.toDecimalPlaces(10, Decimal.ROUND_HALF_UP).toDecimalPlaces(2, Decimal.ROUND_CEIL);
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

  const minutos = receita.tempoPreparoMinutos ?? 0;
  if (!Number.isInteger(minutos) || minutos < 0) {
    throw new PricingError('VALOR_INVALIDO', 'O tempo de preparo deve ser um número inteiro de minutos.', {
      campo: 'tempoPreparoMinutos',
    });
  }
  const valorHora = decimalNaoNegativo(
    receita.valorHoraTrabalho ?? 0,
    'valorHoraTrabalho',
    'O valor da hora de trabalho',
  );

  const taxaVenda = decimalNaoNegativo(
    receita.taxaVendaPercentual ?? 0,
    'taxaVendaPercentual',
    'A taxa de venda',
  );
  if (margem.plus(taxaVenda).gt(MARGEM_MAXIMA_PERCENTUAL)) {
    throw new PricingError(
      'VALOR_INVALIDO',
      `A margem somada à taxa de venda não pode passar de ${MARGEM_MAXIMA_PERCENTUAL}%.`,
      { campo: 'taxaVendaPercentual' },
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
  const custoMaoDeObra = valorHora.times(minutos).div(60);
  const custoTotal = custoIngredientes.plus(custoExtras).plus(custoMaoDeObra);
  const custoPorPorcao = custoTotal.div(receita.rendimentoPorcoes);

  const fracaoDaTaxa = taxaVenda.div(100);
  /** O que sobra de um preço depois da taxa de venda e do custo. */
  const lucroDe = (preco: Decimal) => preco.times(new D(1).minus(fracaoDaTaxa)).minus(custoPorPorcao);
  const margemDe = (preco: Decimal) => (preco.isZero() ? new D(0) : lucroDe(preco).div(preco).times(100));

  // Margem sobre o preço de venda, com a taxa saindo do mesmo preço:
  // preço = custo / (1 − margem/100 − taxa/100).
  const precoSugeridoPorPorcao = precoEmCentavos(
    custoPorPorcao.div(new D(1).minus(margem.div(100)).minus(fracaoDaTaxa)),
  );

  // Markup simples: preço = custo × (1 + percentual/100). Parece igual, mas rende menos.
  const precoMarkup = custoPorPorcao.times(new D(1).plus(margem.div(100)));

  let praticado: ResultadoPraticado | null = null;
  if (receita.precoVendaPraticado !== undefined && receita.precoVendaPraticado !== null) {
    const preco = decimalPositivo(
      receita.precoVendaPraticado,
      'precoVendaPraticado',
      'O preço cobrado hoje',
    );
    const lucro = lucroDe(preco);
    const margemReal = margemDe(preco);
    praticado = {
      precoPorPorcao: preco,
      taxaVendaPorPorcao: preco.times(fracaoDaTaxa),
      lucroPorPorcao: lucro,
      lucroPorReceita: lucro.times(receita.rendimentoPorcoes),
      margemRealPercentual: margemReal,
      situacao: lucro.isNegative() ? 'PREJUIZO' : margemReal.lt(margem) ? 'ABAIXO_DA_META' : 'NA_META',
    };
  }

  return {
    itens,
    custoIngredientes,
    custoExtras,
    custoMaoDeObra,
    custoTotal,
    custoPorPorcao,
    precoSugeridoPorPorcao,
    taxaVendaPorPorcao: precoSugeridoPorPorcao.times(fracaoDaTaxa),
    lucroPorPorcao: lucroDe(precoSugeridoPorPorcao),
    praticado,
    markup: {
      precoPorPorcao: precoMarkup,
      lucroPorPorcao: lucroDe(precoMarkup),
      margemRealPercentual: margemDe(precoMarkup),
    },
  };
}

/**
 * Procura sinais de que o custo calculado não é o real. Nada aqui impede salvar: um item de
 * menos de 1 centavo pode ser mesmo uma pitada de sal, mas vale a pessoa conferir.
 */
export function gerarAlertas(
  receita: ReceitaParaCalculo,
  calculo: CalculoReceita,
  hoje: Date,
): AlertaDaReceita[] {
  if (receita.itens.length === 0) {
    return [];
  }

  const alertas: AlertaDaReceita[] = [];

  receita.itens.forEach(({ insumo }, indiceItem) => {
    const nome = insumo.nome ?? 'Este insumo';
    const item = calculo.itens[indiceItem];
    const embalagens = item.quantidadeBase.div(
      new D(insumo.quantidadeEmbalagem).times(UNIDADES[insumo.unidadeCompra].fator),
    );

    if (precoDaEmbalagem(insumo).isZero()) {
      alertas.push({
        codigo: 'INSUMO_SEM_PRECO',
        mensagem: `${nome} está com preço zero e entra de graça na conta.`,
        indiceItem,
      });
    } else if (item.custo.lt('0.01')) {
      alertas.push({
        codigo: 'CUSTO_MUITO_BAIXO',
        mensagem: `${nome} custa menos de 1 centavo nesta receita. Confira a unidade: é g ou kg?`,
        indiceItem,
      });
    }

    if (embalagens.gt(EMBALAGENS_POR_ITEM_SUSPEITAS)) {
      alertas.push({
        codigo: 'QUANTIDADE_MUITO_ALTA',
        mensagem: `${nome} usa mais de ${EMBALAGENS_POR_ITEM_SUSPEITAS} embalagens nesta receita. Confira a quantidade e a unidade.`,
        indiceItem,
      });
    }

    if (insumo.precoConferidoEm) {
      const dias = (hoje.getTime() - insumo.precoConferidoEm.getTime()) / 86_400_000;
      if (dias > DIAS_PARA_PRECO_ANTIGO) {
        alertas.push({
          codigo: 'PRECO_ANTIGO',
          mensagem: `O preço de ${nome} não é conferido há mais de ${DIAS_PARA_PRECO_ANTIGO} dias. Abra o insumo e salve para confirmar.`,
          indiceItem,
        });
      }
    }
  });

  if ((receita.tempoPreparoMinutos ?? 0) === 0 || new D(receita.valorHoraTrabalho ?? 0).isZero()) {
    alertas.push({
      codigo: 'SEM_MAO_DE_OBRA',
      mensagem: 'Seu tempo de trabalho não está no custo: o lucro mostrado ainda inclui o seu pagamento.',
    });
  }

  return alertas;
}

/** Arredonda para 2 casas (meio para cima). Usar somente na exibição final. */
export function arredondarMoeda(valor: ValorDecimal): string {
  return new D(valor).toFixed(2, Decimal.ROUND_HALF_UP);
}
