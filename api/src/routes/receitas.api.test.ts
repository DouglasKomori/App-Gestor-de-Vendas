import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { criarUsuario, type UsuarioDeTeste } from '../test/ajuda';

async function criarInsumo(usuario: UsuarioDeTeste, dados: Record<string, unknown>): Promise<number> {
  const resposta = await request(app).post('/insumos').set(usuario.auth).send(dados);
  if (resposta.status !== 201) {
    throw new Error(`Falha ao criar insumo de teste: ${JSON.stringify(resposta.body)}`);
  }
  return resposta.body.insumo.id;
}

/** Insumos do brigadeiro, com os mesmos valores do teste unitário do módulo de preços. */
async function criarInsumosDoBrigadeiro(usuario: UsuarioDeTeste) {
  return {
    leiteCondensado: await criarInsumo(usuario, {
      nome: 'Leite condensado',
      unidadeCompra: 'G',
      quantidadeEmbalagem: '395',
      precoEmbalagem: '6.50',
    }),
    chocolate: await criarInsumo(usuario, {
      nome: 'Chocolate em pó',
      unidadeCompra: 'G',
      quantidadeEmbalagem: '200',
      precoEmbalagem: '9.00',
    }),
    manteiga: await criarInsumo(usuario, {
      nome: 'Manteiga',
      unidadeCompra: 'G',
      quantidadeEmbalagem: '200',
      precoEmbalagem: '10.00',
    }),
    granulado: await criarInsumo(usuario, {
      nome: 'Granulado',
      unidadeCompra: 'G',
      quantidadeEmbalagem: '500',
      precoEmbalagem: '12.00',
    }),
  };
}

type InsumosDoBrigadeiro = Awaited<ReturnType<typeof criarInsumosDoBrigadeiro>>;

function brigadeiro(insumos: InsumosDoBrigadeiro) {
  return {
    nome: 'Brigadeiro',
    rendimentoPorcoes: 25,
    custosExtrasPercentual: '10',
    margemDesejadaPercentual: '60',
    observacoes: 'Enrolar ainda morno.',
    itens: [
      { insumoId: insumos.leiteCondensado, quantidade: '395', unidade: 'G' },
      { insumoId: insumos.chocolate, quantidade: '30', unidade: 'G' },
      { insumoId: insumos.manteiga, quantidade: '20', unidade: 'G' },
      { insumoId: insumos.granulado, quantidade: '0.05', unidade: 'KG' },
    ],
  };
}

// Ingredientes 10,05; extras 1,005; total 11,055; por porção 0,4422; preço 1,1055.
const CALCULO_DO_BRIGADEIRO = {
  custoIngredientes: '10.05',
  custoExtras: '1.01',
  custoTotal: '11.06',
  custoPorPorcao: '0.44',
  precoSugeridoPorPorcao: '1.11',
  lucroPorPorcao: '0.66',
  markup: { precoPorPorcao: '0.71', lucroPorPorcao: '0.27', margemRealPercentual: '37.50' },
};

async function criarBrigadeiro(usuario: UsuarioDeTeste) {
  const insumos = await criarInsumosDoBrigadeiro(usuario);
  const resposta = await request(app).post('/receitas').set(usuario.auth).send(brigadeiro(insumos));
  return { insumos, resposta };
}

/** Receita mínima válida com um único insumo de R$ 10,00 por unidade. */
async function criarReceitaSimples(usuario: UsuarioDeTeste, dados: Record<string, unknown> = {}) {
  const insumoId = await criarInsumo(usuario, {
    nome: 'Insumo de dez reais',
    unidadeCompra: 'UN',
    quantidadeEmbalagem: '1',
    precoEmbalagem: '10',
  });
  const corpo = {
    nome: 'Receita simples',
    rendimentoPorcoes: 1,
    margemDesejadaPercentual: '50',
    itens: [{ insumoId, quantidade: '1', unidade: 'UN' }],
    ...dados,
  };
  const resposta = await request(app).post('/receitas').set(usuario.auth).send(corpo);
  return { insumoId, corpo, resposta };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('autenticação', () => {
  it.each([
    ['get', '/receitas'],
    ['post', '/receitas'],
    ['post', '/receitas/calcular'],
    ['get', '/receitas/1'],
    ['put', '/receitas/1'],
    ['delete', '/receitas/1'],
  ] as const)('%s %s exige login', async (metodo, caminho) => {
    const resposta = await request(app)[metodo](caminho);

    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('TOKEN_AUSENTE');
  });
});

describe('POST /receitas', () => {
  it('cria a receita com os itens e devolve o cálculo completo', async () => {
    const usuario = await criarUsuario();
    const { insumos, resposta } = await criarBrigadeiro(usuario);

    expect(resposta.status).toBe(201);
    expect(resposta.body.receita).toMatchObject({
      id: expect.any(Number),
      nome: 'Brigadeiro',
      rendimentoPorcoes: 25,
      custosExtrasPercentual: '10',
      margemDesejadaPercentual: '60',
      observacoes: 'Enrolar ainda morno.',
    });
    expect(resposta.body.receita.itens).toEqual([
      {
        id: expect.any(Number),
        insumoId: insumos.leiteCondensado,
        insumoNome: 'Leite condensado',
        insumoUnidadeCompra: 'G',
        quantidade: '395',
        unidade: 'G',
        custo: '6.50',
      },
      {
        id: expect.any(Number),
        insumoId: insumos.chocolate,
        insumoNome: 'Chocolate em pó',
        insumoUnidadeCompra: 'G',
        quantidade: '30',
        unidade: 'G',
        custo: '1.35',
      },
      {
        id: expect.any(Number),
        insumoId: insumos.manteiga,
        insumoNome: 'Manteiga',
        insumoUnidadeCompra: 'G',
        quantidade: '20',
        unidade: 'G',
        custo: '1.00',
      },
      {
        id: expect.any(Number),
        insumoId: insumos.granulado,
        insumoNome: 'Granulado',
        insumoUnidadeCompra: 'G',
        quantidade: '0.05',
        unidade: 'KG',
        custo: '1.20',
      },
    ]);
    expect(resposta.body.receita.calculo).toEqual({
      itens: [
        { insumoId: insumos.leiteCondensado, custo: '6.50' },
        { insumoId: insumos.chocolate, custo: '1.35' },
        { insumoId: insumos.manteiga, custo: '1.00' },
        { insumoId: insumos.granulado, custo: '1.20' },
      ],
      ...CALCULO_DO_BRIGADEIRO,
    });
  });

  it('usa 0% de custos extras e observações vazias quando não são enviados', async () => {
    const usuario = await criarUsuario();
    const { resposta } = await criarReceitaSimples(usuario);

    expect(resposta.status).toBe(201);
    expect(resposta.body.receita.custosExtrasPercentual).toBe('0');
    expect(resposta.body.receita.observacoes).toBeNull();
    // Custo 10 com margem de 50%: preço 20; como markup seria 15.
    expect(resposta.body.receita.calculo).toMatchObject({
      custoPorPorcao: '10.00',
      precoSugeridoPorPorcao: '20.00',
      lucroPorPorcao: '10.00',
      markup: { precoPorPorcao: '15.00', lucroPorPorcao: '5.00', margemRealPercentual: '33.33' },
    });
  });

  it('aceita o mesmo insumo em mais de um item', async () => {
    const usuario = await criarUsuario();
    const { insumoId, resposta } = await criarReceitaSimples(usuario);
    const repetida = await request(app)
      .post('/receitas')
      .set(usuario.auth)
      .send({
        nome: 'Com insumo repetido',
        rendimentoPorcoes: 1,
        margemDesejadaPercentual: '0',
        itens: [
          { insumoId, quantidade: '1', unidade: 'UN' },
          { insumoId, quantidade: '2', unidade: 'UN' },
        ],
      });

    expect(resposta.status).toBe(201);
    expect(repetida.status).toBe(201);
    expect(repetida.body.receita.calculo.custoTotal).toBe('30.00');
  });

  it.each([
    ['nome em branco', { nome: ' ' }, 'nome', 'Informe o nome da receita.'],
    ['rendimento zero', { rendimentoPorcoes: 0 }, 'rendimentoPorcoes', 'O rendimento deve ser de pelo menos 1 porção.'],
    ['rendimento fracionado', { rendimentoPorcoes: 2.5 }, 'rendimentoPorcoes', 'O rendimento deve ser um número inteiro de porções.'],
    ['margem acima de 95', { margemDesejadaPercentual: '95.01' }, 'margemDesejadaPercentual', 'A margem desejada deve ser no máximo 95.'],
    ['margem negativa', { margemDesejadaPercentual: '-1' }, 'margemDesejadaPercentual', 'A margem desejada não pode ser menor que zero.'],
    ['custos extras negativos', { custosExtrasPercentual: '-5' }, 'custosExtrasPercentual', 'O percentual de custos extras não pode ser menor que zero.'],
    ['receita sem itens', { itens: [] }, 'itens', 'Adicione pelo menos um insumo à receita.'],
  ])('recusa %s', async (_caso, dados, campo, mensagem) => {
    const usuario = await criarUsuario();
    const { resposta } = await criarReceitaSimples(usuario, dados);

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.code).toBe('DADOS_INVALIDOS');
    expect(resposta.body.error.details).toEqual([{ campo, mensagem }]);
  });

  it('recusa item com quantidade zero, apontando qual item', async () => {
    const usuario = await criarUsuario();
    const { insumoId } = await criarReceitaSimples(usuario);
    const resposta = await request(app)
      .post('/receitas')
      .set(usuario.auth)
      .send({
        nome: 'Quantidade zerada',
        rendimentoPorcoes: 1,
        margemDesejadaPercentual: '30',
        itens: [
          { insumoId, quantidade: '1', unidade: 'UN' },
          { insumoId, quantidade: '0', unidade: 'UN' },
        ],
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.details).toEqual([
      { campo: 'itens.1.quantidade', mensagem: 'A quantidade deve ser maior que zero.' },
    ]);
  });

  it('recusa unidade incompatível com o insumo e não salva nada', async () => {
    const usuario = await criarUsuario();
    const farinha = await criarInsumo(usuario, {
      nome: 'Farinha',
      unidadeCompra: 'KG',
      quantidadeEmbalagem: '1',
      precoEmbalagem: '5.49',
    });
    const resposta = await request(app)
      .post('/receitas')
      .set(usuario.auth)
      .send({
        nome: 'Massa em mililitros',
        rendimentoPorcoes: 1,
        margemDesejadaPercentual: '30',
        itens: [{ insumoId: farinha, quantidade: '100', unidade: 'ML' }],
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toEqual({
      code: 'DADOS_INVALIDOS',
      message: 'Os dados enviados são inválidos.',
      details: [
        {
          campo: 'itens.0.unidade',
          mensagem: 'Não é possível usar "ml" (volume) em um insumo comprado em "kg" (massa).',
        },
      ],
    });
    expect(await prisma.receita.count({ where: { userId: usuario.id } })).toBe(0);
  });

  it('recusa insumo que não existe', async () => {
    const usuario = await criarUsuario();
    const { resposta } = await criarReceitaSimples(usuario, {
      itens: [{ insumoId: 999999999, quantidade: '1', unidade: 'UN' }],
    });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.details).toEqual([
      { campo: 'itens.0.insumoId', mensagem: 'Insumo não encontrado.' },
    ]);
  });
});

describe('GET /receitas', () => {
  it('lista as receitas com custo por porção e preço sugerido, em ordem alfabética', async () => {
    const usuario = await criarUsuario();
    await criarReceitaSimples(usuario, { nome: 'Torta' });
    await criarBrigadeiro(usuario);

    const resposta = await request(app).get('/receitas').set(usuario.auth);

    expect(resposta.status).toBe(200);
    expect(resposta.body.receitas).toEqual([
      {
        id: expect.any(Number),
        nome: 'Brigadeiro',
        rendimentoPorcoes: 25,
        custoPorPorcao: '0.44',
        precoSugeridoPorPorcao: '1.11',
        updatedAt: expect.any(String),
      },
      {
        id: expect.any(Number),
        nome: 'Torta',
        rendimentoPorcoes: 1,
        custoPorPorcao: '10.00',
        precoSugeridoPorPorcao: '20.00',
        updatedAt: expect.any(String),
      },
    ]);
  });

  it('devolve lista vazia para quem ainda não tem receitas', async () => {
    const usuario = await criarUsuario();
    const resposta = await request(app).get('/receitas').set(usuario.auth);

    expect(resposta.body).toEqual({ receitas: [] });
  });
});

describe('GET /receitas/:id', () => {
  it('devolve a receita com o cálculo completo', async () => {
    const usuario = await criarUsuario();
    const { resposta: criada } = await criarBrigadeiro(usuario);
    const resposta = await request(app)
      .get(`/receitas/${criada.body.receita.id}`)
      .set(usuario.auth);

    expect(resposta.status).toBe(200);
    expect(resposta.body.receita).toEqual(criada.body.receita);
    expect(resposta.body.receita.calculo).toMatchObject(CALCULO_DO_BRIGADEIRO);
  });

  it('recalcula com o preço atual do insumo, porque o custo não é salvo', async () => {
    const usuario = await criarUsuario();
    const { insumoId, resposta: criada } = await criarReceitaSimples(usuario);
    const url = `/receitas/${criada.body.receita.id}`;

    await request(app).put(`/insumos/${insumoId}`).set(usuario.auth).send({
      nome: 'Insumo de dez reais',
      unidadeCompra: 'UN',
      quantidadeEmbalagem: '1',
      precoEmbalagem: '12.50',
    });

    const detalhe = await request(app).get(url).set(usuario.auth);
    const lista = await request(app).get('/receitas').set(usuario.auth);

    expect(detalhe.body.receita.calculo).toMatchObject({
      custoPorPorcao: '12.50',
      precoSugeridoPorPorcao: '25.00',
    });
    expect(lista.body.receitas[0]).toMatchObject({
      custoPorPorcao: '12.50',
      precoSugeridoPorPorcao: '25.00',
    });
  });

  it.each(['999999999', 'abc'])('devolve 404 para id inexistente ou inválido (%s)', async (id) => {
    const usuario = await criarUsuario();
    const resposta = await request(app).get(`/receitas/${id}`).set(usuario.auth);

    expect(resposta.status).toBe(404);
    expect(resposta.body.error).toEqual({
      code: 'RECEITA_NAO_ENCONTRADA',
      message: 'Receita não encontrada.',
    });
  });
});

describe('PUT /receitas/:id', () => {
  it('atualiza os dados e substitui todos os itens', async () => {
    const usuario = await criarUsuario();
    const { insumos, resposta: criada } = await criarBrigadeiro(usuario);

    const resposta = await request(app)
      .put(`/receitas/${criada.body.receita.id}`)
      .set(usuario.auth)
      .send({
        nome: 'Brigadeiro gourmet',
        rendimentoPorcoes: 10,
        custosExtrasPercentual: '0',
        margemDesejadaPercentual: '50',
        itens: [{ insumoId: insumos.manteiga, quantidade: '100', unidade: 'G' }],
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.receita).toMatchObject({
      id: criada.body.receita.id,
      nome: 'Brigadeiro gourmet',
      rendimentoPorcoes: 10,
      observacoes: null,
    });
    expect(resposta.body.receita.itens).toHaveLength(1);
    expect(resposta.body.receita.itens[0]).toMatchObject({ insumoNome: 'Manteiga', custo: '5.00' });
    expect(resposta.body.receita.calculo).toMatchObject({
      custoTotal: '5.00',
      custoPorPorcao: '0.50',
      precoSugeridoPorPorcao: '1.00',
    });
    expect(await prisma.receitaItem.count({ where: { receitaId: criada.body.receita.id } })).toBe(1);
  });

  it('não altera a receita quando os novos dados são inválidos', async () => {
    const usuario = await criarUsuario();
    const { resposta: criada } = await criarBrigadeiro(usuario);
    const url = `/receitas/${criada.body.receita.id}`;

    const resposta = await request(app)
      .put(url)
      .set(usuario.auth)
      .send({ ...criada.body.receita, nome: 'Alterada', itens: [] });
    const depois = await request(app).get(url).set(usuario.auth);

    expect(resposta.status).toBe(400);
    expect(depois.body.receita).toEqual(criada.body.receita);
  });
});

describe('DELETE /receitas/:id', () => {
  it('exclui a receita e os itens, mas mantém os insumos', async () => {
    const usuario = await criarUsuario();
    const { insumos, resposta: criada } = await criarBrigadeiro(usuario);
    const id = criada.body.receita.id;

    const resposta = await request(app).delete(`/receitas/${id}`).set(usuario.auth);

    expect(resposta.status).toBe(204);
    expect(await prisma.receita.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.receitaItem.count({ where: { receitaId: id } })).toBe(0);
    expect(await prisma.insumo.findUnique({ where: { id: insumos.manteiga } })).not.toBeNull();
  });

  it('libera a exclusão do insumo depois que a receita que o usava é excluída', async () => {
    const usuario = await criarUsuario();
    const { insumoId, resposta: criada } = await criarReceitaSimples(usuario);

    const bloqueada = await request(app).delete(`/insumos/${insumoId}`).set(usuario.auth);
    await request(app).delete(`/receitas/${criada.body.receita.id}`).set(usuario.auth);
    const liberada = await request(app).delete(`/insumos/${insumoId}`).set(usuario.auth);

    expect(bloqueada.status).toBe(409);
    expect(bloqueada.body.error.code).toBe('INSUMO_EM_USO');
    expect(bloqueada.body.error.message).toContain('"Receita simples"');
    expect(liberada.status).toBe(204);
  });
});

describe('POST /receitas/calcular', () => {
  it('calcula uma receita que ainda não foi salva', async () => {
    const usuario = await criarUsuario();
    const insumos = await criarInsumosDoBrigadeiro(usuario);
    const { nome: _nome, observacoes: _observacoes, ...dados } = brigadeiro(insumos);

    const resposta = await request(app).post('/receitas/calcular').set(usuario.auth).send(dados);

    expect(resposta.status).toBe(200);
    expect(resposta.body.calculo).toMatchObject(CALCULO_DO_BRIGADEIRO);
    expect(resposta.body.calculo.itens.map((item: { custo: string }) => item.custo)).toEqual([
      '6.50',
      '1.35',
      '1.00',
      '1.20',
    ]);
    expect(await prisma.receita.count({ where: { userId: usuario.id } })).toBe(0);
  });

  it('devolve tudo zerado enquanto a receita não tem itens', async () => {
    const usuario = await criarUsuario();
    const resposta = await request(app)
      .post('/receitas/calcular')
      .set(usuario.auth)
      .send({ rendimentoPorcoes: 10, margemDesejadaPercentual: '30', itens: [] });

    expect(resposta.status).toBe(200);
    expect(resposta.body.calculo).toEqual({
      itens: [],
      custoIngredientes: '0.00',
      custoExtras: '0.00',
      custoTotal: '0.00',
      custoPorPorcao: '0.00',
      precoSugeridoPorPorcao: '0.00',
      lucroPorPorcao: '0.00',
      markup: { precoPorPorcao: '0.00', lucroPorPorcao: '0.00', margemRealPercentual: '0.00' },
    });
  });

  it('recusa unidade incompatível apontando o item', async () => {
    const usuario = await criarUsuario();
    const leite = await criarInsumo(usuario, {
      nome: 'Leite',
      unidadeCompra: 'L',
      quantidadeEmbalagem: '1',
      precoEmbalagem: '4.50',
    });
    const resposta = await request(app)
      .post('/receitas/calcular')
      .set(usuario.auth)
      .send({
        rendimentoPorcoes: 1,
        margemDesejadaPercentual: '30',
        itens: [{ insumoId: leite, quantidade: '200', unidade: 'G' }],
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.details[0].campo).toBe('itens.0.unidade');
  });

  it('recusa margem fora do limite', async () => {
    const usuario = await criarUsuario();
    const resposta = await request(app)
      .post('/receitas/calcular')
      .set(usuario.auth)
      .send({ rendimentoPorcoes: 1, margemDesejadaPercentual: '100', itens: [] });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.details[0].campo).toBe('margemDesejadaPercentual');
  });
});

describe('isolamento entre usuários', () => {
  it('a lista de um usuário não mostra receitas de outro', async () => {
    const maria = await criarUsuario('Maria');
    const joao = await criarUsuario('João');
    await criarReceitaSimples(maria, { nome: 'Receita da Maria' });
    await criarReceitaSimples(joao, { nome: 'Receita do João' });

    const resposta = await request(app).get('/receitas').set(joao.auth);

    expect(resposta.body.receitas.map((r: { nome: string }) => r.nome)).toEqual(['Receita do João']);
  });

  it('ver, alterar ou excluir a receita de outro usuário devolve 404 e não muda nada', async () => {
    const maria = await criarUsuario('Maria');
    const joao = await criarUsuario('João');
    const { resposta: criada } = await criarReceitaSimples(maria);
    const { corpo: corpoDoJoao } = await criarReceitaSimples(joao);
    const url = `/receitas/${criada.body.receita.id}`;

    const ver = await request(app).get(url).set(joao.auth);
    const alterar = await request(app)
      .put(url)
      .set(joao.auth)
      .send({ ...corpoDoJoao, nome: 'Invadida' });
    const excluir = await request(app).delete(url).set(joao.auth);

    for (const resposta of [ver, alterar, excluir]) {
      expect(resposta.status).toBe(404);
      expect(resposta.body.error.code).toBe('RECEITA_NAO_ENCONTRADA');
    }

    const intacta = await request(app).get(url).set(maria.auth);
    expect(intacta.status).toBe(200);
    expect(intacta.body.receita).toEqual(criada.body.receita);
  });

  it('não deixa usar o insumo de outro usuário em uma receita nem no cálculo', async () => {
    const maria = await criarUsuario('Maria');
    const joao = await criarUsuario('João');
    const insumoDaMaria = await criarInsumo(maria, {
      nome: 'Insumo secreto da Maria',
      unidadeCompra: 'UN',
      quantidadeEmbalagem: '1',
      precoEmbalagem: '99.99',
    });
    const itens = [{ insumoId: insumoDaMaria, quantidade: '1', unidade: 'UN' }];

    const salvar = await request(app)
      .post('/receitas')
      .set(joao.auth)
      .send({ nome: 'Tentativa', rendimentoPorcoes: 1, margemDesejadaPercentual: '30', itens });
    const calcular = await request(app)
      .post('/receitas/calcular')
      .set(joao.auth)
      .send({ rendimentoPorcoes: 1, margemDesejadaPercentual: '30', itens });

    for (const resposta of [salvar, calcular]) {
      expect(resposta.status).toBe(400);
      expect(resposta.body.error.details).toEqual([
        { campo: 'itens.0.insumoId', mensagem: 'Insumo não encontrado.' },
      ]);
      expect(JSON.stringify(resposta.body)).not.toContain('99.99');
    }
    expect(await prisma.receita.count({ where: { userId: joao.id } })).toBe(0);
  });
});
