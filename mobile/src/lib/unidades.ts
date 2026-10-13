export const UNIDADES = ['G', 'KG', 'ML', 'L', 'UN'] as const;

export type Unidade = (typeof UNIDADES)[number];

/** Como a unidade aparece na tela. */
export const ROTULO_UNIDADE: Record<Unidade, string> = {
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  L: 'L',
  UN: 'un',
};

export const NOME_UNIDADE: Record<Unidade, string> = {
  G: 'gramas',
  KG: 'quilos',
  ML: 'mililitros',
  L: 'litros',
  UN: 'unidades',
};
