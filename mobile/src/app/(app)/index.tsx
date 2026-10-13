import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { cores } from '@/constants/tema';
import { useAuth } from '@/contexts/auth';

// Tela provisória da área logada. Insumos e receitas entram nas Fases 4 e 5.
export default function Inicio() {
  const { sessao, sair } = useAuth();
  const usuario = sessao.status === 'autenticado' ? sessao.usuario : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Olá, {usuario?.nome.split(' ')[0]}!</Text>
        <Text style={styles.subtitulo}>Você entrou como {usuario?.email}.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTexto}>
          Em breve você vai cadastrar seus insumos e montar as fichas técnicas das suas receitas
          aqui.
        </Text>
      </View>

      <Botao titulo="Sair" variante="secundario" onPress={sair} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
    padding: 24,
    justifyContent: 'center',
    gap: 24,
  },
  cabecalho: {
    alignItems: 'center',
    gap: 8,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: cores.texto,
  },
  subtitulo: {
    fontSize: 16,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  card: {
    backgroundColor: cores.superficie,
    borderRadius: 16,
    padding: 20,
  },
  cardTexto: {
    fontSize: 16,
    color: cores.texto,
    textAlign: 'center',
  },
});
