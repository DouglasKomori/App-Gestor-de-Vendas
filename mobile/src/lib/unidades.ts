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

type Dimensao = 'MASSA' | 'VOLUME' | 'UNIDADE';

const DIMENSAO: Record<Unidade, Dimensao> = {
  G: 'MASSA',
  KG: 'MASSA',
  ML: 'VOLUME',
  L: 'VOLUME',
  UN: 'UNIDADE',
};

/**
 * Unidades que podem ser usadas na receita para um insumo comprado na unidade informada.
 * Massa e volume não se convertem entre si (a API recusa a combinação).
 */
export function unidadesCompativeis(unidadeCompra: Unidade): Unidade[] {
  return UNIDADES.filter((unidade) => DIMENSAO[unidade] === DIMENSAO[unidadeCompra]);
}

/** Unidade sugerida ao adicionar o insumo a uma receita: a menor da mesma medida (g, ml ou un). */
export function unidadePadraoNaReceita(unidadeCompra: Unidade): Unidade {
  return unidadesCompativeis(unidadeCompra)[0];
}
