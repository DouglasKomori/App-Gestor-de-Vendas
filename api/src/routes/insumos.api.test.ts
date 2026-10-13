import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { criarUsuario, type UsuarioDeTeste } from '../test/ajuda';

const farinha = {
  nome: 'Farinha de trigo',
  unidadeCompra: 'KG',
  quantidadeEmbalagem: '1',
  precoEmbalagem: '5.49',
};

async function criarInsumo(usuario: UsuarioDeTeste, dados: Record<string, unknown> = {}) {
  return request(app)
    .post('/insumos')
    .set(usuario.auth)
    .send({ ...farinha, ...dados });
}

/** Cria direto no banco uma receita que usa o insumo (as rotas de receita chegam na Fase 5). */
async function criarReceitaUsando(
  usuario: UsuarioDeTeste,
  insumoId: number,
  nome: string,
  unidade: 'G' | 'KG' | 'ML' | 'L' | 'UN' = 'G',
) {
  return prisma.receita.create({
    data: {
      userId: usuario.id,
      nome,
      rendimentoPorcoes: 10,
      margemDesejadaPercentual: 30,
      itens: { create: [{ insumoId, quantidade: 100, unidade }] },
    },
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('autenticação', () => {
  it.each([
    ['get', '/insumos'],
    ['post', '/insumos'],
    ['get', '/insumos/1'],
    ['put', '/insumos/1'],
    ['delete', '/insumos/1'],
  ] as const)('%s %s exige login', async (metodo, caminho) => {
    const resposta = await request(app)[metodo](caminho);

    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('TOKEN_AUSENTE');
  });
});

describe('POST /insumos', () => {
  it('cria o insumo e devolve os decimais como texto', async () => {
    const usuario = await criarUsuario();
    const resposta = await criarInsumo(usuario);

    expect(resposta.status).toBe(201);
    expect(resposta.body.insumo).toEqual({
      id: expect.any(Number),
      nome: 'Farinha de trigo',
      unidadeCompra: 'KG',
      quantidadeEmbalagem: '1',
      precoEmbalagem: '5.49',
      aproveitamentoPercentual: '100',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('usa 100% de aproveitamento quando o campo não é enviado', async () => {
    const usuario = await criarUsuario();
    const resposta = await criarInsumo(usuario);

    expect(resposta.body.insumo.aproveitamentoPercentual).toBe('100');
  });

  it('preserva os decimais exatamente como foram enviados', async () => {
    const usuario = await criarUsuario();
    const resposta = await criarInsumo(usuario, {
      nome: '  Frango  ',
      quantidadeEmbalagem: '0.125',
      precoEmbalagem: '1234.5',
      aproveitamentoPercentual: '62.5',
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.insumo).toMatchObject({
      nome: 'Frango',
      quantidadeEmbalagem: '0.125',
      precoEmbalagem: '1234.50',
      aproveitamentoPercentual: '62.5',
    });
  });

  it('aceita números além de texto', async () => {
    const usuario = await criarUsuario();
    const resposta = await criarInsumo(usuario, { quantidadeEmbalagem: 12, precoEmbalagem: 9.6 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.insumo).toMatchObject({ quantidadeEmbalagem: '12', precoEmbalagem: '9.60' });
  });

  it.each([
    ['nome em branco', { nome: '  ' }, 'nome', 'Informe o nome do insumo.'],
    ['unidade desconhecida', { unidadeCompra: 'LITRO' }, 'unidadeCompra', 'Unidade inválida. Use G, KG, ML, L ou UN.'],
    ['quantidade zero', { quantidadeEmbalagem: '0' }, 'quantidadeEmbalagem', 'A quantidade da embalagem deve ser maior que zero.'],
    ['quantidade negativa', { quantidadeEmbalagem: '-1' }, 'quantidadeEmbalagem', 'A quantidade da embalagem não pode ser menor que zero.'],
    ['quantidade com 4 casas', { quantidadeEmbalagem: '1.2345' }, 'quantidadeEmbalagem', 'A quantidade da embalagem deve ter no máximo 3 casas decimais.'],
    ['preço negativo', { precoEmbalagem: '-0.01' }, 'precoEmbalagem', 'O preço da embalagem não pode ser menor que zero.'],
    ['preço com 3 casas', { precoEmbalagem: '5.499' }, 'precoEmbalagem', 'O preço da embalagem deve ter no máximo 2 casas decimais.'],
    ['preço com vírgula', { precoEmbalagem: '5,49' }, 'precoEmbalagem', 'O preço da embalagem deve ser um número (use ponto como separador decimal).'],
    ['preço que não é número', { precoEmbalagem: 'abc' }, 'precoEmbalagem', 'O preço da embalagem deve ser um número (use ponto como separador decimal).'],
    ['aproveitamento zero', { aproveitamentoPercentual: '0' }, 'aproveitamentoPercentual', 'O aproveitamento deve ser maior que zero.'],
    ['aproveitamento acima de 100', { aproveitamentoPercentual: '100.01' }, 'aproveitamentoPercentual', 'O aproveitamento deve ser no máximo 100.'],
  ])('recusa %s', async (_caso, dados, campo, mensagem) => {
    const usuario = await criarUsuario();
    const resposta = await criarInsumo(usuario, dados);

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.code).toBe('DADOS_INVALIDOS');
    expect(resposta.body.error.details).toEqual([{ campo, mensagem }]);
  });

  it('aponta todos os campos obrigatórios que faltam', async () => {
    const usuario = await criarUsuario();
    const resposta = await request(app).post('/insumos').set(usuario.auth).send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.details.map((d: { campo: string }) => d.campo)).toEqual([
      'nome',
      'unidadeCompra',
      'quantidadeEmbalagem',
      'precoEmbalagem',
    ]);
  });

  it('ignora um userId enviado no corpo', async () => {
    const usuario = await criarUsuario();
    const outro = await criarUsuario();
    const resposta = await criarInsumo(usuario, { userId: outro.id });

    const salvo = await prisma.insumo.findUniqueOrThrow({ where: { id: resposta.body.insumo.id } });
    expect(salvo.userId).toBe(usuario.id);
  });
});

describe('GET /insumos', () => {
  it('lista os insumos do usuário em ordem alfabética', async () => {
    const usuario = await criarUsuario();
    await criarInsumo(usuario, { nome: 'Ovos' });
    await criarInsumo(usuario, { nome: 'Açúcar' });
    await criarInsumo(usuario, { nome: 'Manteiga' });

    const resposta = await request(app).get('/insumos').set(usuario.auth);

    expect(resposta.status).toBe(200);
    expect(resposta.body.insumos.map((i: { nome: string }) => i.nome)).toEqual([
      'Açúcar',
      'Manteiga',
      'Ovos',
    ]);
  });

  it('devolve lista vazia para quem ainda não cadastrou nada', async () => {
    const usuario = await criarUsuario();
    const resposta = await request(app).get('/insumos').set(usuario.auth);

    expect(resposta.body).toEqual({ insumos: [] });
  });
});

describe('GET /insumos/:id', () => {
  it('devolve o insumo', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);
    const resposta = await request(app).get(`/insumos/${criado.body.insumo.id}`).set(usuario.auth);

    expect(resposta.status).toBe(200);
    expect(resposta.body.insumo).toEqual(criado.body.insumo);
  });

  it.each(['999999999', 'abc', '1.5', '-1'])('devolve 404 para id inexistente ou inválido (%s)', async (id) => {
    const usuario = await criarUsuario();
    const resposta = await request(app).get(`/insumos/${id}`).set(usuario.auth);

    expect(resposta.status).toBe(404);
    expect(resposta.body.error).toEqual({
      code: 'INSUMO_NAO_ENCONTRADO',
      message: 'Insumo não encontrado.',
    });
  });
});

describe('PUT /insumos/:id', () => {
  it('atualiza todos os campos', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);

    const resposta = await request(app)
      .put(`/insumos/${criado.body.insumo.id}`)
      .set(usuario.auth)
      .send({
        nome: 'Farinha integral',
        unidadeCompra: 'G',
        quantidadeEmbalagem: '500',
        precoEmbalagem: '7.9',
        aproveitamentoPercentual: '95',
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.insumo).toMatchObject({
      id: criado.body.insumo.id,
      nome: 'Farinha integral',
      unidadeCompra: 'G',
      quantidadeEmbalagem: '500',
      precoEmbalagem: '7.90',
      aproveitamentoPercentual: '95',
    });
  });

  it('valida os dados como na criação', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);

    const resposta = await request(app)
      .put(`/insumos/${criado.body.insumo.id}`)
      .set(usuario.auth)
      .send({ ...farinha, precoEmbalagem: '-1' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.details[0].campo).toBe('precoEmbalagem');
  });

  it('permite trocar kg por g mesmo com o insumo em uso', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);
    await criarReceitaUsando(usuario, criado.body.insumo.id, 'Pão caseiro');

    const resposta = await request(app)
      .put(`/insumos/${criado.body.insumo.id}`)
      .set(usuario.auth)
      .send({ ...farinha, unidadeCompra: 'G', quantidadeEmbalagem: '1000' });

    expect(resposta.status).toBe(200);
  });

  it('bloqueia a troca de massa para volume quando o insumo já é usado em receitas', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);
    const receita = await criarReceitaUsando(usuario, criado.body.insumo.id, 'Pão caseiro');

    const resposta = await request(app)
      .put(`/insumos/${criado.body.insumo.id}`)
      .set(usuario.auth)
      .send({ ...farinha, unidadeCompra: 'L' });

    expect(resposta.status).toBe(409);
    expect(resposta.body.error).toEqual({
      code: 'UNIDADE_EM_USO',
      message:
        'Não é possível trocar o tipo de unidade deste insumo, porque ele já é usado em: "Pão caseiro".',
      details: { receitas: [{ id: receita.id, nome: 'Pão caseiro' }] },
    });

    const salvo = await prisma.insumo.findUniqueOrThrow({ where: { id: criado.body.insumo.id } });
    expect(salvo.unidadeCompra).toBe('KG');
  });

  it('permite trocar massa por volume quando o insumo não é usado em nenhuma receita', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);

    const resposta = await request(app)
      .put(`/insumos/${criado.body.insumo.id}`)
      .set(usuario.auth)
      .send({ ...farinha, unidadeCompra: 'L' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.insumo.unidadeCompra).toBe('L');
  });
});

describe('DELETE /insumos/:id', () => {
  it('exclui o insumo', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);

    const resposta = await request(app)
      .delete(`/insumos/${criado.body.insumo.id}`)
      .set(usuario.auth);

    expect(resposta.status).toBe(204);
    expect(await prisma.insumo.findUnique({ where: { id: criado.body.insumo.id } })).toBeNull();
  });

  it('bloqueia a exclusão de insumo usado em receitas, listando as receitas', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);
    const pao = await criarReceitaUsando(usuario, criado.body.insumo.id, 'Pão caseiro');
    const bolo = await criarReceitaUsando(usuario, criado.body.insumo.id, 'Bolo de cenoura');

    const resposta = await request(app)
      .delete(`/insumos/${criado.body.insumo.id}`)
      .set(usuario.auth);

    expect(resposta.status).toBe(409);
    expect(resposta.body.error).toEqual({
      code: 'INSUMO_EM_USO',
      message:
        'Não é possível excluir "Farinha de trigo", porque ele é usado em: "Bolo de cenoura", "Pão caseiro". ' +
        'Remova o insumo dessas receitas antes de excluir.',
      details: {
        receitas: [
          { id: bolo.id, nome: 'Bolo de cenoura' },
          { id: pao.id, nome: 'Pão caseiro' },
        ],
      },
    });
    expect(await prisma.insumo.findUnique({ where: { id: criado.body.insumo.id } })).not.toBeNull();
  });

  it('o banco também impede apagar um insumo em uso (ON DELETE RESTRICT)', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);
    await criarReceitaUsando(usuario, criado.body.insumo.id, 'Pão caseiro');

    await expect(prisma.insumo.delete({ where: { id: criado.body.insumo.id } })).rejects.toThrow();
  });

  it('devolve 404 ao excluir duas vezes', async () => {
    const usuario = await criarUsuario();
    const criado = await criarInsumo(usuario);
    const url = `/insumos/${criado.body.insumo.id}`;

    await request(app).delete(url).set(usuario.auth);
    const resposta = await request(app).delete(url).set(usuario.auth);

    expect(resposta.status).toBe(404);
  });
});

describe('isolamento entre usuários', () => {
  it('a lista de um usuário não mostra insumos de outro', async () => {
    const maria = await criarUsuario('Maria');
    const joao = await criarUsuario('João');
    await criarInsumo(maria, { nome: 'Insumo da Maria' });
    await criarInsumo(joao, { nome: 'Insumo do João' });

    const resposta = await request(app).get('/insumos').set(joao.auth);

    expect(resposta.body.insumos.map((i: { nome: string }) => i.nome)).toEqual(['Insumo do João']);
  });

  it('ver, alterar ou excluir o insumo de outro usuário devolve 404 e não muda nada', async () => {
    const maria = await criarUsuario('Maria');
    const joao = await criarUsuario('João');
    const criado = await criarInsumo(maria);
    const url = `/insumos/${criado.body.insumo.id}`;

    const ver = await request(app).get(url).set(joao.auth);
    const alterar = await request(app)
      .put(url)
      .set(joao.auth)
      .send({ ...farinha, nome: 'Invadido', precoEmbalagem: '0.01' });
    const excluir = await request(app).delete(url).set(joao.auth);

    for (const resposta of [ver, alterar, excluir]) {
      expect(resposta.status).toBe(404);
      expect(resposta.body.error.code).toBe('INSUMO_NAO_ENCONTRADO');
    }

    const intacto = await request(app).get(url).set(maria.auth);
    expect(intacto.status).toBe(200);
    expect(intacto.body.insumo).toEqual(criado.body.insumo);
  });
});
