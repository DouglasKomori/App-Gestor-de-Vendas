import { useEffect, useState } from 'react';

/** Devolve o valor só depois que ele fica `atrasoMs` sem mudar (debounce). */
export function useValorComAtraso<T>(valor: T, atrasoMs: number): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const timeout = setTimeout(() => setAtrasado(valor), atrasoMs);
    return () => clearTimeout(timeout);
  }, [valor, atrasoMs]);

  return atrasado;
}
