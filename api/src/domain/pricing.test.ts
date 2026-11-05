import { describe, expect, it } from 'vitest';

import {
  arredondarMoeda,
  calcularItem,
  calcularReceita,
  converterParaUnidadeBase,
  custoPorUnidadeBase,
  dimensaoDe,
  gerarAlertas,
  PricingError,
  saoCompativeis,
  unidadesCompativeis,
  type InsumoParaCalculo,
  type ItemParaCalculo,
  type ReceitaParaCalculo,
} from './pricing';

const farinha: InsumoParaCalculo = {
  unidadeCompra: 'KG',
  quantidadeEmbalagem: 1,
  precoEmbalagem: '5.49',
  aproveitamentoPercentual: 100,
};

const leite: InsumoParaCalculo = {
  unidadeCompra: 'L',
  quantidadeEmbalagem: 1,
  precoEmbalagem: '4.50',
  aproveitamentoPercentual: 100,
};

const ovos: InsumoParaCalculo = {
  unidadeCompra: 'UN',
  quantidadeEmbalagem: 12,
  precoEmbalagem: '9.60',
  aproveitamentoPercentual: 100,
};

const granulado: InsumoParaCalculo = {
  unidadeCompra: 'G',
  quantidadeEmbalagem: 500,
  precoEmbalagem: '12.00',
  aproveitamentoPercentual: 100,
};

/** Insumo que custa exatamente R$ 10,00 por unidade, para montar receitas de custo conhecido. */
const insumoDeDezReais: InsumoParaCalculo = {
  unidadeCompra: 'UN',
  quantidadeEmbalagem: 1,
  precoEmbalagem: 10,
  aproveitamentoPercentual: 100,
};

/** Receita cujo custo dos ingredientes é `custo` reais (múltiplo de 10). */
function receitaComCusto(custo: number, extras: Partial<ReceitaParaCalculo> = {}): ReceitaParaCalculo {
  return {
    rendimentoPorcoes: 1,
    custosExtrasPercentual: 0,
    margemDesejadaPercentual: 0,
    itens: [{ quantidade: custo / 10, unidade: 'UN', insumo: insumoDeDezReais }],
    ...extras,
  };
}

/** Executa a função e devolve o PricingError lançado (falha se não lançar). */
function erroDe(fn: () => unknown): PricingError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(PricingError);
    return error as PricingError;
  }
  throw new Error('Era esperado um PricingError, mas nada foi lançado.');
}

describe('conversão de unidades', () => {
  it('converte kg para g e L para ml multiplicando por 1000', () => {
    expect(converterParaUnidadeBase(1, 'KG').toString()).toBe('1000');
    expect(converterParaUnidadeBase('0.25', 'KG').toString()).toBe('250');
    expect(converterParaUnidadeBase(2, 'L').toString()).toBe('2000');
    expect(converterParaUnidadeBase('0.355', 'L').toString()).toBe('355');
  });

  it('mantém g, ml e un como estão', () => {
    expect(converterParaUnidadeBase(395, 'G').toString()).toBe('395');
    expect(converterParaUnidadeBase(200, 'ML').toString()).toBe('200');
    expect(converterParaUnidadeBase(12, 'UN').toString()).toBe('12');
  });

  it('classifica cada unidade em massa, volume ou unidade', () => {
    expect(dimensaoDe('G')).toBe('MASSA');
    expect(dimensaoDe('KG')).toBe('MASSA');
    expect(dimensaoDe('ML')).toBe('VOLUME');
    expect(dimensaoDe('L')).toBe('VOLUME');
    expect(dimensaoDe('UN')).toBe('UNIDADE');
  });

  it('lista as unidades compatíveis com a unidade de compra', () => {
    expect(unidadesCompativeis('KG')).toEqual(['G', 'KG']);
    expect(unidadesCompativeis('G')).toEqual(['G', 'KG']);
    expect(unidadesCompativeis('L')).toEqual(['ML', 'L']);
    expect(unidadesCompativeis('UN')).toEqual(['UN']);
    expect(saoCompativeis('G', 'KG')).toBe(true);
    expect(saoCompativeis('G', 'ML')).toBe(false);
  });
});

describe('custo por unidade base do insumo', () => {
  it('divide o preço pela quantidade da embalagem em unidade base', () => {
    expect(custoPorUnidadeBase(farinha).toString()).toBe('0.00549'); // R$ 5,49 / 1000 g
    expect(custoPorUnidadeBase(leite).toString()).toBe('0.0045'); // R$ 4,50 / 1000 ml
    expect(custoPorUnidadeBase(ovos).toString()).toBe('0.8'); // R$ 9,60 / 12 un
    expect(custoPorUnidadeBase(granulado).toString()).toBe('0.024'); // R$ 12,00 / 500 g
  });

  it('aceita os valores como texto, do jeito que vêm do banco', () => {
    const insumo: InsumoParaCalculo = {
      unidadeCompra: 'KG',
      quantidadeEmbalagem: '1.000',
      precoEmbalagem: '5.49',
      aproveitamentoPercentual: '100.00',
    };
    expect(custoPorUnidadeBase(insumo).toString()).toBe('0.00549');
  });

  it('aceita insumo de preço zero', () => {
    expect(custoPorUnidadeBase({ ...farinha, precoEmbalagem: 0 }).toString()).toBe('0');
  });
});

describe('aproveitamento menor que 100%', () => {
  const frango: InsumoParaCalculo = {
    unidadeCompra: 'KG',
    quantidadeEmbalagem: 1,
    precoEmbalagem: 20,
    aproveitamentoPercentual: 80,
  };

  it('encarece o custo por unidade base, porque só parte da embalagem é usada', () => {
    // R$ 20,00 / (1000 g × 80%) = R$ 0,025 por grama, contra R$ 0,02 sem perda.
    expect(custoPorUnidadeBase(frango).toString()).toBe('0.025');
    expect(custoPorUnidadeBase({ ...frango, aproveitamentoPercentual: 100 }).toString()).toBe('0.02');
  });

  it('reflete no custo do item', () => {
    expect(calcularItem({ quantidade: 200, unidade: 'G', insumo: frango }).custo.toString()).toBe('5');
  });

  it('funciona com aproveitamento fracionado', () => {
    const banana: InsumoParaCalculo = {
      unidadeCompra: 'KG',
      quantidadeEmbalagem: 1,
      precoEmbalagem: 6,
      aproveitamentoPercentual: '62.5',
    };
    // R$ 6,00 / 625 g = R$ 0,0096 por grama; 300 g custam R$ 2,88.
    expect(custoPorUnidadeBase(banana).toString()).toBe('0.0096');
    expect(calcularItem({ quantidade: 300, unidade: 'G', insumo: banana }).custo.toString()).toBe('2.88');
  });
});

describe('custo do item', () => {
  it('converte a unidade usada para a unidade base antes de multiplicar', () => {
    // Insumo comprado em kg, usado em g.
    const emGramas = calcularItem({ quantidade: 250, unidade: 'G', insumo: farinha });
    expect(emGramas.quantidadeBase.toString()).toBe('250');
    expect(emGramas.unidadeBase).toBe('G');
    expect(emGramas.custoPorUnidadeBase.toString()).toBe('0.00549');
    expect(emGramas.custo.toString()).toBe('1.3725');

    // Insumo comprado em g, usado em kg.
    const emQuilos = calcularItem({ quantidade: '0.1', unidade: 'KG', insumo: granulado });
    expect(emQuilos.quantidadeBase.toString()).toBe('100');
    expect(emQuilos.custo.toString()).toBe('2.4');
  });

  it('calcula volume e unidade', () => {
    expect(calcularItem({ quantidade: 200, unidade: 'ML', insumo: leite }).custo.toString()).toBe('0.9');
    expect(calcularItem({ quantidade: '0.5', unidade: 'L', insumo: leite }).custo.toString()).toBe('2.25');
    expect(calcularItem({ quantidade: 3, unidade: 'UN', insumo: ovos }).custo.toString()).toBe('2.4');
  });
});

describe('unidades incompatíveis', () => {
  const casos: [ItemParaCalculo['unidade'], string, InsumoParaCalculo][] = [
    ['ML', 'volume em insumo de massa', farinha],
    ['L', 'volume em insumo de massa', granulado],
    ['G', 'massa em insumo de volume', leite],
    ['KG', 'massa em insumo de volume', leite],
    ['UN', 'unidade em insumo de massa', farinha],
    ['G', 'massa em insumo de unidade', ovos],
    ['ML', 'volume em insumo de unidade', ovos],
  ];

  it.each(casos)('recusa %s: %s', (unidade, _descricao, insumo) => {
    const erro = erroDe(() => calcularItem({ quantidade: 1, unidade, insumo }));
    expect(erro.code).toBe('UNIDADES_INCOMPATIVEIS');
    expect(erro.detalhes.campo).toBe('unidade');
  });

  it('explica o problema em português', () => {
    const erro = erroDe(() => calcularItem({ quantidade: 100, unidade: 'ML', insumo: farinha }));
    expect(erro.message).toBe(
      'Não é possível usar "ml" (volume) em um insumo comprado em "kg" (massa).',
    );
  });

  it('informa qual item da receita está errado', () => {
    const erro = erroDe(() =>
      calcularReceita({
        rendimentoPorcoes: 10,
        custosExtrasPercentual: 0,
        margemDesejadaPercentual: 30,
        itens: [
          { quantidade: 250, unidade: 'G', insumo: farinha },
          { quantidade: 100, unidade: 'G', insumo: leite },
        ],
      }),
    );
    expect(erro.code).toBe('UNIDADES_INCOMPATIVEIS');
    expect(erro.detalhes.indiceItem).toBe(1);
  });
});

describe('cálculo da receita', () => {
  it('calcula uma ficha técnica completa (brigadeiro)', () => {
    const leiteCondensado: InsumoParaCalculo = {
      unidadeCompra: 'G',
      quantidadeEmbalagem: 395,
      precoEmbalagem: '6.50',
      aproveitamentoPercentual: 100,
    };
    const chocolateEmPo: InsumoParaCalculo = {
      unidadeCompra: 'G',
      quantidadeEmbalagem: 200,
      precoEmbalagem: '9.00',
      aproveitamentoPercentual: 100,
    };
    const manteiga: InsumoParaCalculo = {
      unidadeCompra: 'G',
      quantidadeEmbalagem: 200,
      precoEmbalagem: '10.00',
      aproveitamentoPercentual: 100,
    };

    const calculo = calcularReceita({
      rendimentoPorcoes: 25,
      custosExtrasPercentual: 10,
      margemDesejadaPercentual: 60,
      itens: [
        { quantidade: 395, unidade: 'G', insumo: leiteCondensado },
        { quantidade: 30, unidade: 'G', insumo: chocolateEmPo },
        { quantidade: 20, unidade: 'G', insumo: manteiga },
        { quantidade: '0.05', unidade: 'KG', insumo: granulado },
      ],
    });

    expect(calculo.itens.map((item) => item.custo.toString())).toEqual(['6.5', '1.35', '1', '1.2']);
    expect(calculo.custoIngredientes.toString()).toBe('10.05');
    expect(calculo.custoExtras.toString()).toBe('1.005');
    expect(calculo.custoTotal.toString()).toBe('11.055');
    expect(calculo.custoPorPorcao.toString()).toBe('0.4422');
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('1.11'); // 1,1055 sobe para o centavo seguinte
    expect(calculo.lucroPorPorcao.toString()).toBe('0.6678');
    expect(calculo.markup.precoPorPorcao.toString()).toBe('0.70752');
    expect(calculo.markup.lucroPorPorcao.toString()).toBe('0.26532');
    expect(calculo.markup.margemRealPercentual.toString()).toBe('37.5');
  });

  it('divide o custo total pelo rendimento', () => {
    const calculo = calcularReceita(receitaComCusto(50, { rendimentoPorcoes: 8 }));
    expect(calculo.custoTotal.toString()).toBe('50');
    expect(calculo.custoPorPorcao.toString()).toBe('6.25');
  });

  it('devolve tudo zerado para uma receita ainda sem itens', () => {
    const calculo = calcularReceita({
      rendimentoPorcoes: 10,
      custosExtrasPercentual: 10,
      margemDesejadaPercentual: 30,
      itens: [],
    });
    expect(calculo.itens).toEqual([]);
    expect(calculo.custoTotal.toString()).toBe('0');
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('0');
    expect(calculo.markup.margemRealPercentual.toString()).toBe('0');
  });
});

describe('custos extras', () => {
  it('soma o percentual sobre o custo dos ingredientes', () => {
    const calculo = calcularReceita(
      receitaComCusto(20, { rendimentoPorcoes: 10, custosExtrasPercentual: 15 }),
    );
    expect(calculo.custoIngredientes.toString()).toBe('20');
    expect(calculo.custoExtras.toString()).toBe('3');
    expect(calculo.custoTotal.toString()).toBe('23');
    expect(calculo.custoPorPorcao.toString()).toBe('2.3');
  });

  it('não altera o custo quando o percentual é zero', () => {
    const calculo = calcularReceita(receitaComCusto(20, { custosExtrasPercentual: 0 }));
    expect(calculo.custoExtras.toString()).toBe('0');
    expect(calculo.custoTotal.toString()).toBe('20');
  });

  it('aceita percentual fracionado e acima de 100', () => {
    expect(
      calcularReceita(receitaComCusto(20, { custosExtrasPercentual: '7.5' })).custoTotal.toString(),
    ).toBe('21.5');
    expect(
      calcularReceita(receitaComCusto(20, { custosExtrasPercentual: 150 })).custoTotal.toString(),
    ).toBe('50');
  });
});

describe('margem desejada', () => {
  it('com margem 0, o preço sugerido é igual ao custo e não há lucro', () => {
    const calculo = calcularReceita(receitaComCusto(10, { margemDesejadaPercentual: 0 }));
    expect(calculo.custoPorPorcao.toString()).toBe('10');
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('10');
    expect(calculo.lucroPorPorcao.toString()).toBe('0');
    expect(calculo.markup.precoPorPorcao.toString()).toBe('10');
    expect(calculo.markup.margemRealPercentual.toString()).toBe('0');
  });

  it('é margem sobre o preço de venda, não markup', () => {
    const calculo = calcularReceita(receitaComCusto(10, { margemDesejadaPercentual: 50 }));
    // Custo 10 com margem de 50%: preço 20 (lucro 10 = 50% do preço).
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('20');
    expect(calculo.lucroPorPorcao.toString()).toBe('10');
    // O mesmo 50% como markup daria só 15, e a margem real cairia para 33,33%.
    expect(calculo.markup.precoPorPorcao.toString()).toBe('15');
    expect(calculo.markup.lucroPorPorcao.toString()).toBe('5');
    expect(calculo.markup.margemRealPercentual.toFixed(6)).toBe('33.333333');
  });

  it('o lucro nunca fica abaixo da margem pedida sobre o preço', () => {
    const calculo = calcularReceita(receitaComCusto(10, { margemDesejadaPercentual: 30 }));
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('14.29'); // 10 / 0,7 = 14,2857...
    expect(calculo.lucroPorPorcao.toString()).toBe('4.29');
    expect(
      calculo.lucroPorPorcao.div(calculo.precoSugeridoPorPorcao).times(100).gte(30),
    ).toBe(true);
    expect(calculo.markup.precoPorPorcao.toString()).toBe('13');
    expect(calculo.markup.margemRealPercentual.toFixed(6)).toBe('23.076923');
  });

  it('aceita o limite de 95%', () => {
    const calculo = calcularReceita(receitaComCusto(10, { margemDesejadaPercentual: 95 }));
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('200');
  });

  it.each([-1, '-0.01', '95.01', 100, 150])('recusa margem fora de 0 a 95 (%s)', (margem) => {
    const erro = erroDe(() =>
      calcularReceita(receitaComCusto(10, { margemDesejadaPercentual: margem })),
    );
    expect(erro.code).toBe('VALOR_INVALIDO');
    expect(erro.detalhes.campo).toBe('margemDesejadaPercentual');
    expect(erro.message).toBe('A margem desejada deve ficar entre 0% e 95%.');
  });
});

describe('arredondamento', () => {
  it('arredonda para 2 casas, meio para cima', () => {
    expect(arredondarMoeda('2.344')).toBe('2.34');
    expect(arredondarMoeda('2.345')).toBe('2.35');
    expect(arredondarMoeda('2.5')).toBe('2.50');
    expect(arredondarMoeda(0)).toBe('0.00');
    expect(arredondarMoeda('1234.5')).toBe('1234.50');
  });

  it('não sofre com a imprecisão de ponto flutuante', () => {
    // Em JavaScript puro, (1.005).toFixed(2) dá "1.00".
    expect(arredondarMoeda('1.005')).toBe('1.01');
    expect(arredondarMoeda('0.615')).toBe('0.62');
  });

  it('soma quantidades decimais sem erro (0,1 + 0,2)', () => {
    const insumo: InsumoParaCalculo = {
      unidadeCompra: 'KG',
      quantidadeEmbalagem: 1,
      precoEmbalagem: 10,
      aproveitamentoPercentual: 100,
    };
    const calculo = calcularReceita({
      rendimentoPorcoes: 1,
      custosExtrasPercentual: 0,
      margemDesejadaPercentual: 0,
      itens: [
        { quantidade: 0.1, unidade: 'KG', insumo },
        { quantidade: 0.2, unidade: 'KG', insumo },
      ],
    });
    expect(calculo.custoIngredientes.toString()).toBe('3');
  });

  it('não arredonda valores intermediários', () => {
    // Três itens de R$ 0,335: a soma exata é 1,005 (R$ 1,01).
    // Arredondando item a item (0,34 × 3) daria R$ 1,02.
    const insumo: InsumoParaCalculo = {
      unidadeCompra: 'KG',
      quantidadeEmbalagem: 1,
      precoEmbalagem: '3.35',
      aproveitamentoPercentual: 100,
    };
    const item: ItemParaCalculo = { quantidade: 100, unidade: 'G', insumo };
    const calculo = calcularReceita({
      rendimentoPorcoes: 1,
      custosExtrasPercentual: 0,
      margemDesejadaPercentual: 0,
      itens: [item, item, item],
    });
    expect(calculo.itens[0].custo.toString()).toBe('0.335');
    expect(calculo.custoIngredientes.toString()).toBe('1.005');
    expect(arredondarMoeda(calculo.custoIngredientes)).toBe('1.01');
  });

  it('não acumula erro em divisões com dízima', () => {
    // 3 unidades por R$ 1,00 (R$ 0,3333... cada): usar as 3 custa exatamente R$ 1,00.
    const insumo: InsumoParaCalculo = {
      unidadeCompra: 'UN',
      quantidadeEmbalagem: 3,
      precoEmbalagem: 1,
      aproveitamentoPercentual: 100,
    };
    expect(calcularItem({ quantidade: 3, unidade: 'UN', insumo }).custo.toString()).toBe('1');

    // R$ 10,00 em 3 porções: R$ 3,33 cada, e 3 porções voltam a R$ 10,00.
    const calculo = calcularReceita(receitaComCusto(10, { rendimentoPorcoes: 3 }));
    expect(arredondarMoeda(calculo.custoPorPorcao)).toBe('3.33');
    expect(arredondarMoeda(calculo.custoPorPorcao.times(3))).toBe('10.00');
  });
});

describe('validações', () => {
  it.each([0, -1, 'abc'])('recusa quantidade da embalagem inválida (%s)', (quantidadeEmbalagem) => {
    const erro = erroDe(() => custoPorUnidadeBase({ ...farinha, quantidadeEmbalagem }));
    expect(erro.code).toBe('VALOR_INVALIDO');
    expect(erro.detalhes.campo).toBe('quantidadeEmbalagem');
  });

  it('recusa preço negativo', () => {
    const erro = erroDe(() => custoPorUnidadeBase({ ...farinha, precoEmbalagem: '-0.01' }));
    expect(erro.detalhes.campo).toBe('precoEmbalagem');
  });

  it.each([0, -10, '100.01', 150])('recusa aproveitamento fora de 0 a 100 (%s)', (aproveitamento) => {
    const erro = erroDe(() =>
      custoPorUnidadeBase({ ...farinha, aproveitamentoPercentual: aproveitamento }),
    );
    expect(erro.code).toBe('VALOR_INVALIDO');
    expect(erro.detalhes.campo).toBe('aproveitamentoPercentual');
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'recusa quantidade de item inválida (%s)',
    (quantidade) => {
      const erro = erroDe(() => calcularItem({ quantidade, unidade: 'G', insumo: farinha }));
      expect(erro.code).toBe('VALOR_INVALIDO');
      expect(erro.detalhes.campo).toBe('quantidade');
    },
  );

  it.each([0, -1, 2.5, Number.NaN])('recusa rendimento inválido (%s)', (rendimentoPorcoes) => {
    const erro = erroDe(() => calcularReceita(receitaComCusto(10, { rendimentoPorcoes })));
    expect(erro.code).toBe('VALOR_INVALIDO');
    expect(erro.detalhes.campo).toBe('rendimentoPorcoes');
  });

  it('recusa custos extras negativos', () => {
    const erro = erroDe(() => calcularReceita(receitaComCusto(10, { custosExtrasPercentual: -5 })));
    expect(erro.detalhes.campo).toBe('custosExtrasPercentual');
  });

  it('informa o item quando um insumo da receita é inválido', () => {
    const erro = erroDe(() =>
      calcularReceita({
        rendimentoPorcoes: 1,
        custosExtrasPercentual: 0,
        margemDesejadaPercentual: 0,
        itens: [
          { quantidade: 1, unidade: 'KG', insumo: farinha },
          { quantidade: 1, unidade: 'KG', insumo: farinha },
          { quantidade: 1, unidade: 'KG', insumo: { ...farinha, aproveitamentoPercentual: 0 } },
        ],
      }),
    );
    expect(erro.detalhes).toEqual({ campo: 'aproveitamentoPercentual', indiceItem: 2 });
  });
});

describe('medidas caseiras', () => {
  const manteiga: InsumoParaCalculo = {
    unidadeCompra: 'G',
    quantidadeEmbalagem: 200,
    precoEmbalagem: 10,
    aproveitamentoPercentual: 100,
  };
  const colher = { quantidade: 20, unidade: 'G' } as const;

  it('multiplica o número de medidas pelo valor de cada uma', () => {
    const item = calcularItem({ quantidade: 2, unidade: 'G', insumo: manteiga, medida: colher });
    expect(item.quantidadeBase.toString()).toBe('40');
    expect(item.custo.toString()).toBe('2');
  });

  it('aceita meia medida', () => {
    const item = calcularItem({ quantidade: '0.5', unidade: 'G', insumo: manteiga, medida: colher });
    expect(item.custo.toString()).toBe('0.5');
  });

  it('converte a unidade da medida para a unidade base', () => {
    const item = calcularItem({
      quantidade: 1,
      unidade: 'G',
      insumo: farinha,
      medida: { quantidade: '0.12', unidade: 'KG' },
    });
    expect(item.quantidadeBase.toString()).toBe('120');
    expect(item.custo.toString()).toBe('0.6588');
  });

  it('o valor da medida muda o custo: 1 colher de 12 g não custa o mesmo que 1 de 20 g', () => {
    const custo = (gramas: number) =>
      calcularItem({
        quantidade: 1,
        unidade: 'G',
        insumo: manteiga,
        medida: { quantidade: gramas, unidade: 'G' },
      }).custo.toString();
    expect(custo(12)).toBe('0.6');
    expect(custo(20)).toBe('1');
  });

  it('recusa medida de volume em insumo de massa', () => {
    const erro = erroDe(() =>
      calcularItem({
        quantidade: 1,
        unidade: 'ML',
        insumo: manteiga,
        medida: { quantidade: 15, unidade: 'ML' },
      }),
    );
    expect(erro.code).toBe('UNIDADES_INCOMPATIVEIS');
  });

  it('recusa medida de valor zero', () => {
    const erro = erroDe(() =>
      calcularItem({
        quantidade: 1,
        unidade: 'G',
        insumo: manteiga,
        medida: { quantidade: 0, unidade: 'G' },
      }),
    );
    expect(erro.detalhes.campo).toBe('medidaCaseiraId');
  });
});

describe('mão de obra', () => {
  it('soma o tempo de trabalho ao custo total', () => {
    const calculo = calcularReceita(
      receitaComCusto(10, { rendimentoPorcoes: 5, tempoPreparoMinutos: 90, valorHoraTrabalho: 15 }),
    );
    expect(calculo.custoMaoDeObra.toString()).toBe('22.5');
    expect(calculo.custoTotal.toString()).toBe('32.5');
    expect(calculo.custoPorPorcao.toString()).toBe('6.5');
  });

  it('não aplica o percentual de custos extras sobre a mão de obra', () => {
    const calculo = calcularReceita(
      receitaComCusto(10, {
        custosExtrasPercentual: 10,
        tempoPreparoMinutos: 60,
        valorHoraTrabalho: 20,
      }),
    );
    expect(calculo.custoExtras.toString()).toBe('1');
    expect(calculo.custoTotal.toString()).toBe('31');
  });

  it('sem tempo informado, o custo fica como antes', () => {
    expect(calcularReceita(receitaComCusto(10)).custoMaoDeObra.toString()).toBe('0');
  });

  it.each([-1, 1.5])('recusa tempo inválido (%s)', (tempoPreparoMinutos) => {
    const erro = erroDe(() => calcularReceita(receitaComCusto(10, { tempoPreparoMinutos })));
    expect(erro.detalhes.campo).toBe('tempoPreparoMinutos');
  });

  it('recusa valor da hora negativo', () => {
    const erro = erroDe(() => calcularReceita(receitaComCusto(10, { valorHoraTrabalho: -1 })));
    expect(erro.detalhes.campo).toBe('valorHoraTrabalho');
  });
});

describe('taxa de venda', () => {
  it('o preço sugerido cobre a taxa e ainda entrega a margem pedida', () => {
    const calculo = calcularReceita(
      receitaComCusto(10, { margemDesejadaPercentual: 50, taxaVendaPercentual: 20 }),
    );
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('33.34'); // 10 / (1 − 0,5 − 0,2)
    expect(calculo.taxaVendaPorPorcao.toString()).toBe('6.668');
    expect(calculo.lucroPorPorcao.toString()).toBe('16.672');
    expect(
      calculo.lucroPorPorcao.div(calculo.precoSugeridoPorPorcao).times(100).gte(50),
    ).toBe(true);
  });

  it('a comparação com markup também desconta a taxa', () => {
    const calculo = calcularReceita(
      receitaComCusto(10, { margemDesejadaPercentual: 50, taxaVendaPercentual: 20 }),
    );
    expect(calculo.markup.precoPorPorcao.toString()).toBe('15');
    expect(calculo.markup.lucroPorPorcao.toString()).toBe('2');
    expect(calculo.markup.margemRealPercentual.toFixed(2)).toBe('13.33');
  });

  it('aceita margem e taxa que somam exatamente 95%', () => {
    const calculo = calcularReceita(
      receitaComCusto(10, { margemDesejadaPercentual: 90, taxaVendaPercentual: 5 }),
    );
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('200');
  });

  it('recusa margem e taxa que somam mais de 95%', () => {
    const erro = erroDe(() =>
      calcularReceita(receitaComCusto(10, { margemDesejadaPercentual: 90, taxaVendaPercentual: 6 })),
    );
    expect(erro.detalhes.campo).toBe('taxaVendaPercentual');
    expect(erro.message).toBe('A margem somada à taxa de venda não pode passar de 95%.');
  });

  it('recusa taxa negativa', () => {
    const erro = erroDe(() => calcularReceita(receitaComCusto(10, { taxaVendaPercentual: -1 })));
    expect(erro.detalhes.campo).toBe('taxaVendaPercentual');
  });
});

describe('preço sugerido em centavos', () => {
  function comCusto(preco: string, margemDesejadaPercentual: number) {
    return calcularReceita({
      rendimentoPorcoes: 1,
      custosExtrasPercentual: 0,
      margemDesejadaPercentual,
      itens: [
        {
          quantidade: 1,
          unidade: 'UN',
          insumo: {
            unidadeCompra: 'UN',
            quantidadeEmbalagem: 1,
            precoEmbalagem: preco,
            aproveitamentoPercentual: 100,
          },
        },
      ],
    });
  }

  it('sobe para o centavo seguinte, para não entregar menos que a margem', () => {
    // 0,4418 / 0,4 = 1,1045: arredondar para 1,10 daria só 59,8% de margem.
    const calculo = comCusto('0.4418', 60);
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('1.11');
    expect(calculo.lucroPorPorcao.div(calculo.precoSugeridoPorPorcao).times(100).gte(60)).toBe(true);
  });

  it('não sobe quando o valor já é exato', () => {
    expect(comCusto('10', 50).precoSugeridoPorPorcao.toString()).toBe('20');
  });
});

describe('preço cobrado hoje', () => {
  const receita = (preco: string | number, extras: Partial<ReceitaParaCalculo> = {}) =>
    calcularReceita(
      receitaComCusto(10, {
        margemDesejadaPercentual: 50,
        precoVendaPraticado: preco,
        ...extras,
      }),
    ).praticado!;

  it('mostra o prejuízo quando o preço não cobre o custo', () => {
    const praticado = receita(8, { rendimentoPorcoes: 1 });
    expect(praticado.situacao).toBe('PREJUIZO');
    expect(praticado.lucroPorPorcao.toString()).toBe('-2');
    expect(praticado.margemRealPercentual.toString()).toBe('-25');
  });

  it('soma o resultado da receita inteira', () => {
    const calculo = calcularReceita(
      receitaComCusto(50, { rendimentoPorcoes: 5, precoVendaPraticado: 8 }),
    );
    expect(calculo.praticado!.lucroPorPorcao.toString()).toBe('-2');
    expect(calculo.praticado!.lucroPorReceita.toString()).toBe('-10');
  });

  it('avisa quando lucra, mas abaixo da margem desejada', () => {
    const praticado = receita(15);
    expect(praticado.situacao).toBe('ABAIXO_DA_META');
    expect(praticado.margemRealPercentual.toFixed(2)).toBe('33.33');
  });

  it('confirma quando o preço entrega a margem', () => {
    expect(receita(20).situacao).toBe('NA_META');
  });

  it('um preço que parece dar lucro vira prejuízo depois da taxa', () => {
    const praticado = receita(11, { taxaVendaPercentual: 20 });
    expect(praticado.taxaVendaPorPorcao.toString()).toBe('2.2');
    expect(praticado.lucroPorPorcao.toString()).toBe('-1.2');
    expect(praticado.situacao).toBe('PREJUIZO');
  });

  it('o preço sugerido sempre fica na meta', () => {
    const sugerido = calcularReceita(
      receitaComCusto(10, { margemDesejadaPercentual: 30, taxaVendaPercentual: 12 }),
    ).precoSugeridoPorPorcao;
    const praticado = calcularReceita(
      receitaComCusto(10, {
        margemDesejadaPercentual: 30,
        taxaVendaPercentual: 12,
        precoVendaPraticado: sugerido,
      }),
    ).praticado!;
    expect(praticado.situacao).toBe('NA_META');
  });

  it('fica de fora quando não foi informado', () => {
    expect(calcularReceita(receitaComCusto(10)).praticado).toBeNull();
  });

  it('recusa preço zero', () => {
    const erro = erroDe(() => calcularReceita(receitaComCusto(10, { precoVendaPraticado: 0 })));
    expect(erro.detalhes.campo).toBe('precoVendaPraticado');
  });
});

describe('alertas', () => {
  const HOJE = new Date('2026-11-05T12:00:00Z');
  const comTrabalho = { tempoPreparoMinutos: 30, valorHoraTrabalho: 15 };

  function alertas(itens: ItemParaCalculo[], extras: Partial<ReceitaParaCalculo> = comTrabalho) {
    const receita: ReceitaParaCalculo = {
      rendimentoPorcoes: 1,
      custosExtrasPercentual: 0,
      margemDesejadaPercentual: 30,
      itens,
      ...extras,
    };
    return gerarAlertas(receita, calcularReceita(receita), HOJE);
  }

  const diasAtras = (dias: number) => new Date(HOJE.getTime() - dias * 86_400_000);

  it('não acusa nada em uma receita normal', () => {
    expect(alertas([{ quantidade: 250, unidade: 'G', insumo: farinha }])).toEqual([]);
  });

  it('não acusa nada enquanto a receita não tem itens', () => {
    expect(alertas([], {})).toEqual([]);
  });

  it('avisa que o tempo de trabalho não está no custo', () => {
    const codigos = (extras: Partial<ReceitaParaCalculo>) =>
      alertas([{ quantidade: 250, unidade: 'G', insumo: farinha }], extras).map((a) => a.codigo);

    expect(codigos({})).toEqual(['SEM_MAO_DE_OBRA']);
    expect(codigos({ tempoPreparoMinutos: 30 })).toEqual(['SEM_MAO_DE_OBRA']);
    expect(codigos({ valorHoraTrabalho: 15 })).toEqual(['SEM_MAO_DE_OBRA']);
  });

  it('acusa o clássico "2" em g quando a pessoa pensou em 2 kg', () => {
    const [alerta] = alertas([
      { quantidade: 250, unidade: 'G', insumo: leiteEmGramas() },
      { quantidade: 1, unidade: 'G', insumo: { ...farinha, nome: 'Farinha' } },
    ]);
    expect(alerta).toEqual({
      codigo: 'CUSTO_MUITO_BAIXO',
      mensagem: 'Farinha custa menos de 1 centavo nesta receita. Confira a unidade: é g ou kg?',
      indiceItem: 1,
    });
  });

  it('acusa insumo com preço zero', () => {
    const [alerta] = alertas([
      { quantidade: 1, unidade: 'KG', insumo: { ...farinha, nome: 'Farinha', precoEmbalagem: 0 } },
    ]);
    expect(alerta.codigo).toBe('INSUMO_SEM_PRECO');
    expect(alerta.mensagem).toBe('Farinha está com preço zero e entra de graça na conta.');
  });

  it('acusa quantidade absurda, mas aceita até 20 embalagens', () => {
    expect(alertas([{ quantidade: 20, unidade: 'KG', insumo: farinha }])).toEqual([]);
    expect(alertas([{ quantidade: 21, unidade: 'KG', insumo: farinha }])[0].codigo).toBe(
      'QUANTIDADE_MUITO_ALTA',
    );
  });

  it('considera a medida caseira ao medir a quantidade', () => {
    const [alerta] = alertas([
      {
        quantidade: 200,
        unidade: 'G',
        insumo: farinha,
        medida: { quantidade: 120, unidade: 'G' },
      },
    ]);
    expect(alerta.codigo).toBe('QUANTIDADE_MUITO_ALTA');
  });

  it('avisa de preço não conferido há mais de 60 dias', () => {
    const insumo = (dias: number) => ({ ...farinha, nome: 'Farinha', precoConferidoEm: diasAtras(dias) });

    expect(alertas([{ quantidade: 250, unidade: 'G', insumo: insumo(59) }])).toEqual([]);
    expect(alertas([{ quantidade: 250, unidade: 'G', insumo: insumo(61) }])[0].codigo).toBe(
      'PRECO_ANTIGO',
    );
  });
});

/** Insumo em gramas de custo normal, para compor receitas nos testes de alerta. */
function leiteEmGramas(): InsumoParaCalculo {
  return { unidadeCompra: 'G', quantidadeEmbalagem: 395, precoEmbalagem: '6.50', aproveitamentoPercentual: 100 };
}
