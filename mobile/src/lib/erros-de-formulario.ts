import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/lib/api';

/**
 * Quando a API recusa os dados (400 com `details: [{ campo, mensagem }]`), mostra cada
 * mensagem no campo correspondente. Devolve `true` se conseguiu posicionar algum erro.
 */
export function aplicarErrosDaApi<T extends FieldValues>(
  erro: unknown,
  setError: UseFormSetError<T>,
  campos: readonly Path<T>[],
): boolean {
  if (!(erro instanceof ApiError) || !Array.isArray(erro.details)) {
    return false;
  }

  let aplicou = false;
  for (const detalhe of erro.details as { campo?: string; mensagem?: string }[]) {
    const campo = campos.find((nome) => nome === detalhe.campo);
    if (campo && detalhe.mensagem) {
      setError(campo, { message: detalhe.mensagem });
      aplicou = true;
    }
  }
  return aplicou;
}
