import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { cores } from '@/constants/tema';
import { useAuth } from '@/contexts/auth';

export default function Conta() {
  const { sessao, sair } = useAuth();
  const usuario = sessao.status === 'autenticado' ? sessao.usuario : null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.nome}>{usuario?.nome}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
      </View>

      <Botao titulo="Sair da conta" variante="perigo" onPress={sair} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 20,
    gap: 4,
  },
  nome: {
    fontSize: 20,
    fontWeight: '700',
    color: cores.texto,
  },
  email: {
    fontSize: 16,
    color: cores.textoSuave,
  },
});
