import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/constants/tema';

/** Aviso amarelo: não impede salvar, mas pede para a pessoa conferir. */
export function AvisoDeAtencao({ mensagem }: { mensagem: string }) {
  return (
    <View accessibilityRole="alert" style={styles.aviso}>
      <Text style={styles.texto}>{mensagem}</Text>
    </View>
  );
}

export function ListaDeAlertas({ mensagens }: { mensagens: string[] }) {
  if (mensagens.length === 0) {
    return null;
  }

  return (
    <View style={styles.lista}>
      {[...new Set(mensagens)].map((mensagem) => (
        <AvisoDeAtencao key={mensagem} mensagem={mensagem} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: 8,
  },
  aviso: {
    backgroundColor: cores.atencaoFundo,
    borderRadius: 12,
    padding: 12,
  },
  texto: {
    color: cores.atencao,
    fontSize: 14,
  },
});
