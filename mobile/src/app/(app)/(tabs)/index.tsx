import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Carregando, MensagemDeTela } from '@/components/estado-de-tela';
import { cores } from '@/constants/tema';
import { useReceitas } from '@/hooks/use-receitas';
import { formatarMoeda } from '@/lib/formato';
import type { ReceitaResumo } from '@/schemas/receita';

function abrirNovaReceita() {
  router.push('/receitas/nova');
}

function ItemDaLista({ receita }: { receita: ReceitaResumo }) {
  const porcoes = receita.rendimentoPorcoes === 1 ? '1 porção' : `${receita.rendimentoPorcoes} porções`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre a ficha técnica da receita"
      onPress={() => router.push({ pathname: '/receitas/[id]', params: { id: receita.id } })}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressionado]}>
      <View style={styles.itemCabecalho}>
        <Text style={styles.itemNome}>{receita.nome}</Text>
        <Text style={styles.itemPorcoes}>Rende {porcoes}</Text>
      </View>

      <View style={styles.itemValores}>
        <View style={styles.itemValor}>
          <Text style={styles.rotulo}>Custo por porção</Text>
          <Text style={styles.custo}>{formatarMoeda(receita.custoPorPorcao)}</Text>
        </View>
        <View style={styles.itemValor}>
          <Text style={styles.rotulo}>Preço sugerido</Text>
          <Text style={styles.preco}>{formatarMoeda(receita.precoSugeridoPorPorcao)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function Receitas() {
  const receitas = useReceitas();

  // Só mostra carregando/erro quando não há nada para exibir: se uma atualização em segundo
  // plano falhar, a lista já carregada continua na tela.
  if (receitas.data === undefined) {
    return receitas.isError ? (
      <MensagemDeTela
        titulo="Não foi possível carregar as receitas"
        descricao={receitas.error.message}
        acao={{ titulo: 'Tentar novamente', onPress: () => receitas.refetch() }}
      />
    ) : (
      <Carregando />
    );
  }

  if (receitas.data.length === 0) {
    return (
      <MensagemDeTela
        titulo="Nenhuma receita cadastrada"
        descricao="Monte a ficha técnica de uma receita para descobrir quanto ela custa e por quanto vender cada porção."
        acao={{ titulo: 'Criar primeira receita', onPress: abrirNovaReceita }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={receitas.data}
        keyExtractor={(receita) => String(receita.id)}
        renderItem={({ item }) => <ItemDaLista receita={item} />}
        contentContainerStyle={styles.lista}
        refreshing={receitas.isRefetching}
        onRefresh={() => receitas.refetch()}
      />

      <View style={styles.rodape}>
        <Botao titulo="Nova receita" onPress={abrirNovaReceita} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  lista: {
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  item: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  itemPressionado: {
    opacity: 0.7,
  },
  itemCabecalho: {
    gap: 2,
  },
  itemNome: {
    fontSize: 17,
    fontWeight: '600',
    color: cores.texto,
  },
  itemPorcoes: {
    fontSize: 14,
    color: cores.textoSuave,
  },
  itemValores: {
    flexDirection: 'row',
    gap: 16,
  },
  itemValor: {
    flex: 1,
    gap: 2,
  },
  rotulo: {
    fontSize: 13,
    color: cores.textoSuave,
  },
  custo: {
    fontSize: 17,
    fontWeight: '600',
    color: cores.texto,
  },
  preco: {
    fontSize: 17,
    fontWeight: '700',
    color: cores.sucesso,
  },
  rodape: {
    padding: 16,
    paddingTop: 8,
  },
});
