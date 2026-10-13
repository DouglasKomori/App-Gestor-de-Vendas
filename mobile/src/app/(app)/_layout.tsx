import { Stack } from 'expo-router';

import { cores } from '@/constants/tema';

// Área logada. Só é alcançada com sessão válida (ver a proteção em src/app/_layout.tsx).
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: cores.primaria,
        headerTitleStyle: { color: cores.texto },
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: cores.fundo },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="insumos/novo" options={{ title: 'Novo insumo' }} />
      <Stack.Screen name="insumos/[id]" options={{ title: 'Editar insumo' }} />
      <Stack.Screen name="receitas/nova" options={{ title: 'Nova receita' }} />
      <Stack.Screen name="receitas/[id]/index" options={{ title: 'Ficha técnica' }} />
      <Stack.Screen name="receitas/[id]/editar" options={{ title: 'Editar receita' }} />
    </Stack>
  );
}
