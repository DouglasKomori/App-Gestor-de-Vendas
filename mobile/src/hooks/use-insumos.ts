import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { DadosDoInsumo, Insumo } from '@/schemas/insumo';

const CHAVE_LISTA = ['insumos'] as const;
const chaveDoInsumo = (id: number) => ['insumos', id] as const;

export function useInsumos() {
  return useQuery({
    queryKey: CHAVE_LISTA,
    queryFn: async () => (await api<{ insumos: Insumo[] }>('/insumos')).insumos,
  });
}

export function useInsumo(id: number) {
  return useQuery({
    queryKey: chaveDoInsumo(id),
    queryFn: async () => (await api<{ insumo: Insumo }>(`/insumos/${id}`)).insumo,
  });
}

export function useCriarInsumo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: DadosDoInsumo) =>
      (await api<{ insumo: Insumo }>('/insumos', { method: 'POST', body: dados })).insumo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_LISTA, exact: true }),
  });
}

export function useAtualizarInsumo(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: DadosDoInsumo) =>
      (await api<{ insumo: Insumo }>(`/insumos/${id}`, { method: 'PUT', body: dados })).insumo,
    onSuccess: (insumo) => {
      queryClient.setQueryData(chaveDoInsumo(id), insumo);
      // O preço do insumo muda o custo das receitas que o usam.
      queryClient.invalidateQueries({ queryKey: ['receitas'] });
      return queryClient.invalidateQueries({ queryKey: CHAVE_LISTA, exact: true });
    },
  });
}

export function useExcluirInsumo(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/insumos/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_LISTA, exact: true }),
  });
}
