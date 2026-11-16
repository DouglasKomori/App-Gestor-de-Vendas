import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { ComoOCalculoFunciona } from '@/components/como-o-calculo-funciona';
import { ResumoDoNegocio } from '@/components/resumo-do-negocio';
import { cores } from '@/constants/tema';
import { useAuth } from '@/contexts/auth';

export default function Conta() {
  const { sessao, sair } = useAuth();
  const usuario = sessao.status === 'autenticado' ? sessao.usuario : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <View style={styles.card}>
        <Text style={styles.nome}>{usuario?.nome}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
      </View>

      <ResumoDoNegocio />

      <ComoOCalculoFunciona />

      <Botao titulo="Sair da conta" variante="perigo" onPress={sair} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
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
