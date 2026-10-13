import { describe, expect, it } from 'vitest';

import {
  arredondarMoeda,
  calcularItem,
  calcularReceita,
  converterParaUnidadeBase,
  custoPorUnidadeBase,
  dimensaoDe,
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
    expect(calculo.precoSugeridoPorPorcao.toString()).toBe('1.1055');
    expect(calculo.lucroPorPorcao.toString()).toBe('0.6633');
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

  it('o lucro corresponde exatamente à margem pedida sobre o preço', () => {
    const calculo = calcularReceita(receitaComCusto(10, { margemDesejadaPercentual: 30 }));
    expect(calculo.precoSugeridoPorPorcao.toFixed(6)).toBe('14.285714'); // 10 / 0,7
    expect(calculo.lucroPorPorcao.toFixed(6)).toBe('4.285714');
    expect(
      calculo.lucroPorPorcao.div(calculo.precoSugeridoPorPorcao).times(100).toFixed(10),
    ).toBe('30.0000000000');
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
