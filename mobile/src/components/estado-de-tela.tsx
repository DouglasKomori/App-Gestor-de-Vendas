import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { cores } from '@/constants/tema';

/** Indicador de carregamento ocupando a tela toda. */
export function Carregando() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={cores.primaria} />
    </View>
  );
}

interface MensagemDeTelaProps {
  titulo: string;
  descricao?: string;
  /** Botão opcional, ex.: "Tentar novamente" ou "Cadastrar o primeiro". */
  acao?: { titulo: string; onPress: () => void };
}

/** Mensagem centralizada para lista vazia ou erro ao carregar. */
export function MensagemDeTela({ titulo, descricao, acao }: MensagemDeTelaProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{titulo}</Text>
      {descricao && <Text style={styles.descricao}>{descricao}</Text>}
      {acao && (
        <View style={styles.acao}>
          <Botao titulo={acao.titulo} onPress={acao.onPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: cores.fundo,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: cores.texto,
    textAlign: 'center',
  },
  descricao: {
    fontSize: 16,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  acao: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
});
