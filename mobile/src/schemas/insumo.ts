import { z } from 'zod';

import { UNIDADES, type Unidade } from '@/lib/unidades';
import { decimalDigitado } from '@/schemas/decimal';

// As mesmas regras são validadas de novo na API (api/src/routes/insumos.ts).

export const insumoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Digite o nome do insumo.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  unidadeCompra: z.enum(UNIDADES),
  quantidadeEmbalagem: decimalDigitado({
    obrigatorio: 'Digite a quantidade da embalagem.',
    positivo: true,
    maximo: 999999,
    casas: 3,
  }),
  precoEmbalagem: decimalDigitado({
    obrigatorio: 'Digite o preço que você pagou.',
    maximo: 999999.99,
    casas: 2,
  }),
  aproveitamentoPercentual: decimalDigitado({
    obrigatorio: 'Digite o aproveitamento. Se não há perda, use 100.',
    positivo: true,
    maximo: 100,
    casas: 2,
  }),
});

/** O que o usuário digita (tudo texto). */
export type CamposDoInsumo = z.input<typeof insumoSchema>;
/** O que é enviado à API (decimais com ponto). */
export type DadosDoInsumo = z.output<typeof insumoSchema>;

/** Insumo como a API devolve. Os decimais chegam como texto. */
export interface Insumo {
  id: number;
  nome: string;
  unidadeCompra: Unidade;
  quantidadeEmbalagem: string;
  precoEmbalagem: string;
  aproveitamentoPercentual: string;
  createdAt: string;
  updatedAt: string;
}
