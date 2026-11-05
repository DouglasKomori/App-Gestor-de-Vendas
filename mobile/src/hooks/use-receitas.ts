import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useValorComAtraso } from '@/hooks/use-valor-com-atraso';
import { api } from '@/lib/api';
import {
  prepararCalculo,
  type Calculo,
  type DadosDaReceita,
  type Receita,
  type ReceitaResumo,
} from '@/schemas/receita';

// Todas as chaves começam com "receitas": alterar um insumo invalida tudo de uma vez.
const CHAVE_LISTA = ['receitas'] as const;
const chaveDaReceita = (id: number) => ['receitas', id] as const;

const ATRASO_DO_CALCULO_MS = 300;

export function useReceitas() {
  return useQuery({
    queryKey: CHAVE_LISTA,
    queryFn: async () => (await api<{ receitas: ReceitaResumo[] }>('/receitas')).receitas,
  });
}

export function useReceita(id: number) {
  return useQuery({
    queryKey: chaveDaReceita(id),
    queryFn: async () => (await api<{ receita: Receita }>(`/receitas/${id}`)).receita,
  });
}

export function useCriarReceita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: DadosDaReceita) =>
      (await api<{ receita: Receita }>('/receitas', { method: 'POST', body: dados })).receita,
    onSuccess: (receita) => {
      queryClient.setQueryData(chaveDaReceita(receita.id), receita);
      return queryClient.invalidateQueries({ queryKey: CHAVE_LISTA, exact: true });
    },
  });
}

export function useAtualizarReceita(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: DadosDaReceita) =>
      (await api<{ receita: Receita }>(`/receitas/${id}`, { method: 'PUT', body: dados })).receita,
    onSuccess: (receita) => {
      queryClient.setQueryData(chaveDaReceita(id), receita);
      return queryClient.invalidateQueries({ queryKey: CHAVE_LISTA, exact: true });
    },
  });
}

export function useExcluirReceita(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/receitas/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_LISTA, exact: true }),
  });
}

type CamposEmEdicao = Parameters<typeof prepararCalculo>[0];

/**
 * Cálculo da ficha técnica enquanto a pessoa edita. Pede o cálculo à API
 * (POST /receitas/calcular) 300 ms depois da última alteração.
 */
export function useCalculoAoVivo(campos: CamposEmEdicao) {
  const preparado = prepararCalculo(campos);
  const pedido = preparado ? JSON.stringify(preparado) : null;
  const pedidoComAtraso = useValorComAtraso(pedido, ATRASO_DO_CALCULO_MS);

  const consulta = useQuery({
    queryKey: ['receitas', 'calculo', pedidoComAtraso],
    queryFn: async () => {
      const { dados, indices } = JSON.parse(pedidoComAtraso!) as NonNullable<typeof preparado>;
      const { calculo } = await api<{ calculo: Calculo }>('/receitas/calcular', {
        method: 'POST',
        body: dados,
      });
      // Custo e alertas de cada item, indexados pela posição do item no formulário.
      const custoPorItem: Record<number, string> = {};
      calculo.itens.forEach((item, posicao) => {
        custoPorItem[indices[posicao]] = item.custo;
      });
      const alertasPorItem: Record<number, string[]> = {};
      const alertasGerais: string[] = [];
      calculo.alertas.forEach(({ mensagem, indiceItem }) => {
        if (indiceItem === undefined) {
          alertasGerais.push(mensagem);
        } else {
          (alertasPorItem[indices[indiceItem]] ??= []).push(mensagem);
        }
      });
      return { calculo, custoPorItem, alertasPorItem, alertasGerais };
    },
    enabled: pedidoComAtraso !== null,
    placeholderData: keepPreviousData,
  });

  return {
    /** `null` enquanto os campos gerais da receita não estiverem preenchidos. */
    // Com erro, o último cálculo já pode estar velho: melhor mostrar a falha do que um custo antigo.
    resultado: pedido === null || consulta.isError ? null : (consulta.data ?? null),
    /** Itens que ainda não entram na conta, por estarem sem quantidade válida. */
    itensDeFora: preparado ? (campos.itens?.length ?? 0) - preparado.indices.length : 0,
    calculando: pedido !== null && (pedido !== pedidoComAtraso || consulta.isFetching),
    erro: pedido !== null && consulta.isError ? consulta.error : null,
  };
}
