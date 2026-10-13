import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Carregando } from '@/components/estado-de-tela';
import { TelaSemConexao } from '@/components/tela-sem-conexao';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { queryClient } from '@/lib/query-client';

// A tela de abertura fica visível até sabermos se há um login válido,
// para a tela de login não piscar para quem já está logado.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { sessao, sair, tentarNovamente } = useAuth();
  const carregando = sessao.status === 'carregando';
  const autenticado = sessao.status === 'autenticado';

  useEffect(() => {
    if (!carregando) {
      SplashScreen.hide();
    }
  }, [carregando]);

  if (carregando) {
    // Na abertura, a tela de abertura cobre este indicador. Ele só aparece ao tocar em
    // "Tentar novamente" na tela de sem conexão.
    return <Carregando />;
  }

  if (sessao.status === 'sem-conexao') {
    return <TelaSemConexao onTentarNovamente={tentarNovamente} onSair={sair} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={autenticado}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      {/* Sem login, a primeira tela disponível é a de login. */}
      <Stack.Protected guard={!autenticado}>
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
      </Stack.Protected>
    </Stack>
  );
}
