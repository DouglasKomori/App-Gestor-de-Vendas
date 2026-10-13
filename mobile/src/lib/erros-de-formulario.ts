import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/lib/api';

/**
 * Distribui um erro de salvamento pelo formulário.
 *
 * Quando a API recusa os dados (400 com `details: [{ campo, mensagem }]`), cada mensagem vai
 * para o campo correspondente. Devolve o texto que deve aparecer como erro geral: as mensagens
 * que não têm campo na tela, ou a mensagem do próprio erro. Devolve `null` se tudo foi
 * mostrado nos campos.
 */
export function distribuirErroDaApi<T extends FieldValues>(
  erro: unknown,
  setError: UseFormSetError<T>,
  /** Diz se o formulário mostra erro neste caminho (ex.: "nome" ou "itens.0.unidade"). */
  campoExiste: (campo: string) => boolean,
): string | null {
  if (!(erro instanceof ApiError) || !Array.isArray(erro.details)) {
    return erro instanceof Error ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.';
  }

  const semCampo: string[] = [];
  for (const detalhe of erro.details as { campo?: string; mensagem?: string }[]) {
    if (!detalhe.mensagem) {
      continue;
    }
    if (detalhe.campo && campoExiste(detalhe.campo)) {
      setError(detalhe.campo as Path<T>, { message: detalhe.mensagem });
    } else {
      semCampo.push(detalhe.mensagem);
    }
  }

  if (semCampo.length > 0) {
    return semCampo.join(' ');
  }
  return erro.details.length > 0 ? null : erro.message;
}

/** Texto do aviso quando a pessoa tenta salvar com campos inválidos. */
export const CONFIRA_OS_CAMPOS = 'Confira os campos destacados em vermelho.';
