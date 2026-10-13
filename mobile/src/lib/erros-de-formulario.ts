import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/lib/api';

/**
 * Quando a API recusa os dados (400 com `details: [{ campo, mensagem }]`), mostra cada
 * mensagem no campo correspondente. Devolve `true` se conseguiu posicionar algum erro.
 */
export function aplicarErrosDaApi<T extends FieldValues>(
  erro: unknown,
  setError: UseFormSetError<T>,
  /** Campos do formulário, ou uma função que diz se o caminho existe (ex.: "itens.0.unidade"). */
  campos: readonly Path<T>[] | ((campo: string) => boolean),
): boolean {
  if (!(erro instanceof ApiError) || !Array.isArray(erro.details)) {
    return false;
  }

  let aplicou = false;
  for (const detalhe of erro.details as { campo?: string; mensagem?: string }[]) {
    const existe =
      typeof campos === 'function'
        ? campos(detalhe.campo ?? '')
        : campos.some((nome) => nome === detalhe.campo);
    if (existe && detalhe.mensagem) {
      setError(detalhe.campo as Path<T>, { message: detalhe.mensagem });
      aplicou = true;
    }
  }
  return aplicou;
}
