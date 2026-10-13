import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL, verificarApi } from '@/lib/api';

type Status = { tipo: 'carregando' } | { tipo: 'ok' } | { tipo: 'erro'; mensagem: string };

async function consultarApi(): Promise<Status> {
  try {
    await verificarApi();
    return { tipo: 'ok' };
  } catch (error) {
    return { tipo: 'erro', mensagem: (error as Error).message };
  }
}

// Tela provisória da Fase 1: confirma que o app abre e que consegue falar com a API.
export default function Index() {
  const [status, setStatus] = useState<Status>({ tipo: 'carregando' });

  useEffect(() => {
    let ativo = true;
    consultarApi().then((resultado) => {
      if (ativo) setStatus(resultado);
    });
    return () => {
      ativo = false;
    };
  }, []);

  function testarConexao() {
    setStatus({ tipo: 'carregando' });
    consultarApi().then(setStatus);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestor de Vendas</Text>
        <Text style={styles.subtitle}>Descubra o custo real das suas receitas.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Conexão com a API</Text>
        <Text style={styles.url}>{API_URL || 'URL não configurada'}</Text>

        {status.tipo === 'carregando' && <ActivityIndicator style={styles.statusRow} />}
        {status.tipo === 'ok' && (
          <Text style={[styles.statusRow, styles.ok]}>Conectado: API e banco funcionando.</Text>
        )}
        {status.tipo === 'erro' && (
          <Text style={[styles.statusRow, styles.erro]}>{status.mensagem}</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={testarConexao}
          disabled={status.tipo === 'carregando'}>
          <Text style={styles.buttonText}>Testar de novo</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    padding: 24,
    justifyContent: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B1F24',
  },
  subtitle: {
    fontSize: 16,
    color: '#5B6470',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B6470',
  },
  url: {
    fontSize: 16,
    color: '#1B1F24',
  },
  statusRow: {
    marginVertical: 12,
    fontSize: 16,
    alignSelf: 'flex-start',
  },
  ok: {
    color: '#1A7F4B',
  },
  erro: {
    color: '#B3261E',
  },
  button: {
    backgroundColor: '#1F6FEB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
