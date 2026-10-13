import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/constants/tema';

export function AvisoDeErro({ mensagem }: { mensagem: string }) {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <Text style={styles.texto}>{mensagem}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: cores.erroFundo,
    borderRadius: 12,
    padding: 12,
  },
  texto: {
    color: cores.erro,
    fontSize: 15,
  },
});
