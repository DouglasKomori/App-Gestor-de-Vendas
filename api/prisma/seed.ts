/**
 * Cria uma conta de demonstração com insumos e receitas de exemplo.
 *
 *   npm run db:seed
 *
 * Pode rodar quantas vezes quiser: a conta de demonstração é apagada e recriada.
 * As outras contas do banco não são tocadas.
 */
import bcrypt from 'bcrypt';

import type { Unidade } from '../src/generated/prisma/client';
import { prisma } from '../src/lib/prisma';

const DEMO = {
  nome: 'Maria Demonstração',
  email: 'demo@gestordevendas.app',
  senha: 'demo12345',
};

interface InsumoDeExemplo {
  nome: string;
  unidadeCompra: Unidade;
  quantidadeEmbalagem: string;
  precoEmbalagem: string;
  aproveitamentoPercentual?: string;
}

const INSUMOS = {
  leiteCondensado: { nome: 'Leite condensado', unidadeCompra: 'G', quantidadeEmbalagem: '395', precoEmbalagem: '6.50' },
  chocolateEmPo: { nome: 'Chocolate em pó 50%', unidadeCompra: 'G', quantidadeEmbalagem: '200', precoEmbalagem: '9.00' },
  manteiga: { nome: 'Manteiga', unidadeCompra: 'G', quantidadeEmbalagem: '200', precoEmbalagem: '10.00' },
  granulado: { nome: 'Granulado', unidadeCompra: 'G', quantidadeEmbalagem: '500', precoEmbalagem: '12.00' },
  forminha: { nome: 'Forminha nº 5', unidadeCompra: 'UN', quantidadeEmbalagem: '100', precoEmbalagem: '4.00' },
  // Insumos com perda: casca, aparas e limpeza reduzem o que é aproveitado.
  frango: { nome: 'Peito de frango', unidadeCompra: 'KG', quantidadeEmbalagem: '1', precoEmbalagem: '22.00', aproveitamentoPercentual: '85' },
  cebola: { nome: 'Cebola', unidadeCompra: 'KG', quantidadeEmbalagem: '1', precoEmbalagem: '5.00', aproveitamentoPercentual: '88' },
  alho: { nome: 'Alho', unidadeCompra: 'G', quantidadeEmbalagem: '200', precoEmbalagem: '6.00', aproveitamentoPercentual: '90' },
  cenoura: { nome: 'Cenoura', unidadeCompra: 'KG', quantidadeEmbalagem: '1', precoEmbalagem: '6.00', aproveitamentoPercentual: '85' },
  arroz: { nome: 'Arroz', unidadeCompra: 'KG', quantidadeEmbalagem: '5', precoEmbalagem: '28.00' },
  feijao: { nome: 'Feijão carioca', unidadeCompra: 'KG', quantidadeEmbalagem: '1', precoEmbalagem: '8.50' },
  oleo: { nome: 'Óleo de soja', unidadeCompra: 'ML', quantidadeEmbalagem: '900', precoEmbalagem: '7.50' },
  embalagemMarmita: { nome: 'Embalagem de marmita', unidadeCompra: 'UN', quantidadeEmbalagem: '50', precoEmbalagem: '35.00' },
  farinha: { nome: 'Farinha de trigo', unidadeCompra: 'KG', quantidadeEmbalagem: '1', precoEmbalagem: '5.49' },
  acucar: { nome: 'Açúcar', unidadeCompra: 'KG', quantidadeEmbalagem: '1', precoEmbalagem: '4.80' },
  ovos: { nome: 'Ovos', unidadeCompra: 'UN', quantidadeEmbalagem: '12', precoEmbalagem: '9.60' },
  fermento: { nome: 'Fermento em pó', unidadeCompra: 'G', quantidadeEmbalagem: '100', precoEmbalagem: '3.50' },
  leite: { nome: 'Leite integral', unidadeCompra: 'L', quantidadeEmbalagem: '1', precoEmbalagem: '4.50' },
} satisfies Record<string, InsumoDeExemplo>;

type ChaveDeInsumo = keyof typeof INSUMOS;

interface ReceitaDeExemplo {
  nome: string;
  rendimentoPorcoes: number;
  custosExtrasPercentual: string;
  margemDesejadaPercentual: string;
  observacoes: string;
  itens: [insumo: ChaveDeInsumo, quantidade: string, unidade: Unidade][];
}

const RECEITAS: ReceitaDeExemplo[] = [
  {
    nome: 'Brigadeiro tradicional',
    rendimentoPorcoes: 25,
    custosExtrasPercentual: '10',
    margemDesejadaPercentual: '60',
    observacoes: 'Rende 25 brigadeiros de 20 g. Enrolar ainda morno, com as mãos untadas.',
    itens: [
      ['leiteCondensado', '395', 'G'],
      ['chocolateEmPo', '30', 'G'],
      ['manteiga', '20', 'G'],
      ['granulado', '50', 'G'],
      ['forminha', '25', 'UN'],
    ],
  },
  {
    nome: 'Marmita de frango',
    rendimentoPorcoes: 5,
    custosExtrasPercentual: '12',
    margemDesejadaPercentual: '45',
    observacoes: 'Frango grelhado, arroz, feijão e cenoura refogada. Consumir em até 3 dias na geladeira.',
    itens: [
      ['frango', '750', 'G'],
      ['arroz', '0.5', 'KG'],
      ['feijao', '300', 'G'],
      ['cenoura', '200', 'G'],
      ['cebola', '100', 'G'],
      ['alho', '15', 'G'],
      ['oleo', '30', 'ML'],
      ['embalagemMarmita', '5', 'UN'],
    ],
  },
  {
    nome: 'Bolo de cenoura com cobertura',
    rendimentoPorcoes: 12,
    custosExtrasPercentual: '10',
    margemDesejadaPercentual: '50',
    observacoes: 'Rende 12 fatias. Assar a 180 °C por cerca de 40 minutos.',
    itens: [
      ['cenoura', '300', 'G'],
      ['farinha', '240', 'G'],
      ['acucar', '300', 'G'],
      ['ovos', '3', 'UN'],
      ['oleo', '200', 'ML'],
      ['fermento', '15', 'G'],
      ['chocolateEmPo', '60', 'G'],
      ['leite', '100', 'ML'],
      ['manteiga', '20', 'G'],
    ],
  },
];

async function apagarContaDeDemonstracao() {
  const existente = await prisma.user.findUnique({ where: { email: DEMO.email } });
  if (!existente) {
    return;
  }
  // Receitas antes dos insumos: um insumo em uso não pode ser apagado.
  await prisma.receita.deleteMany({ where: { userId: existente.id } });
  await prisma.insumo.deleteMany({ where: { userId: existente.id } });
  await prisma.user.delete({ where: { id: existente.id } });
}

async function main() {
  await apagarContaDeDemonstracao();

  const user = await prisma.user.create({
    data: { nome: DEMO.nome, email: DEMO.email, senhaHash: await bcrypt.hash(DEMO.senha, 10) },
  });

  const idDoInsumo = {} as Record<ChaveDeInsumo, number>;
  for (const chave of Object.keys(INSUMOS) as ChaveDeInsumo[]) {
    const insumo = await prisma.insumo.create({ data: { ...INSUMOS[chave], userId: user.id } });
    idDoInsumo[chave] = insumo.id;
  }

  for (const { itens, ...receita } of RECEITAS) {
    await prisma.receita.create({
      data: {
        ...receita,
        userId: user.id,
        itens: {
          create: itens.map(([insumo, quantidade, unidade]) => ({
            insumoId: idDoInsumo[insumo],
            quantidade,
            unidade,
          })),
        },
      },
    });
  }

  console.log('Conta de demonstração criada.');
  console.log(`  Email: ${DEMO.email}`);
  console.log(`  Senha: ${DEMO.senha}`);
  console.log(`  ${Object.keys(INSUMOS).length} insumos e ${RECEITAS.length} receitas.`);
}

main()
  .catch((error) => {
    console.error('Não foi possível criar os dados de exemplo:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
