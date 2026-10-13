import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { cores } from '@/constants/tema';
import { API_URL } from '@/lib/api';

interface TelaSemConexaoProps {
  onTentarNovamente: () => void;
  onSair: () => void;
}

/** Mostrada ao abrir o app quando há um login salvo, mas a API não respondeu. */
export function TelaSemConexao({ onTentarNovamente, onSair }: TelaSemConexaoProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.textos}>
        <Text style={styles.titulo}>Sem conexão com o servidor</Text>
        <Text style={styles.descricao}>
          Não conseguimos confirmar seu login. Confira sua internet e tente de novo.
        </Text>
        {__DEV__ && <Text style={styles.detalhe}>Servidor: {API_URL || 'não configurado'}</Text>}
      </View>
      <Botao titulo="Tentar novamente" onPress={onTentarNovamente} />
      <Botao titulo="Entrar com outra conta" variante="secundario" onPress={onSair} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  textos: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: cores.texto,
    textAlign: 'center',
  },
  descricao: {
    fontSize: 16,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  detalhe: {
    fontSize: 13,
    color: cores.textoSuave,
  },
});
