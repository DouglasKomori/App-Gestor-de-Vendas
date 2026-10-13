import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Carregando, MensagemDeTela } from '@/components/estado-de-tela';
import { cores } from '@/constants/tema';
import { useInsumos } from '@/hooks/use-insumos';
import { formatarDecimal, formatarMoeda, normalizarParaBusca } from '@/lib/formato';
import { ROTULO_UNIDADE } from '@/lib/unidades';
import type { Insumo } from '@/schemas/insumo';

function abrirNovoInsumo() {
  router.push('/insumos/novo');
}

function ItemDaLista({ insumo }: { insumo: Insumo }) {
  const embalagem = `${formatarDecimal(insumo.quantidadeEmbalagem)} ${ROTULO_UNIDADE[insumo.unidadeCompra]}`;
  const temPerda = insumo.aproveitamentoPercentual !== '100';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre o insumo para editar"
      onPress={() => router.push({ pathname: '/insumos/[id]', params: { id: insumo.id } })}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressionado]}>
      <View style={styles.itemTextos}>
        <Text style={styles.itemNome}>{insumo.nome}</Text>
        <Text style={styles.itemDetalhe}>
          {embalagem} por {formatarMoeda(insumo.precoEmbalagem)}
        </Text>
        {temPerda && (
          <Text style={styles.itemDetalhe}>
            Aproveitamento de {formatarDecimal(insumo.aproveitamentoPercentual)}%
          </Text>
        )}
      </View>
      <Text style={styles.itemSeta}>›</Text>
    </Pressable>
  );
}

export default function Insumos() {
  const insumos = useInsumos();
  const [busca, setBusca] = useState('');

  if (insumos.isPending) {
    return <Carregando />;
  }

  if (insumos.isError) {
    return (
      <MensagemDeTela
        titulo="Não foi possível carregar os insumos"
        descricao={insumos.error.message}
        acao={{ titulo: 'Tentar novamente', onPress: () => insumos.refetch() }}
      />
    );
  }

  if (insumos.data.length === 0) {
    return (
      <MensagemDeTela
        titulo="Nenhum insumo cadastrado"
        descricao="Cadastre o que você compra para produzir: farinha, ovos, leite, embalagens..."
        acao={{ titulo: 'Cadastrar primeiro insumo', onPress: abrirNovoInsumo }}
      />
    );
  }

  const termo = normalizarParaBusca(busca);
  const filtrados = insumos.data.filter((insumo) =>
    normalizarParaBusca(insumo.nome).includes(termo),
  );

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Buscar insumo"
        placeholder="Buscar insumo"
        placeholderTextColor={cores.textoSuave}
        value={busca}
        onChangeText={setBusca}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        style={styles.busca}
      />

      <FlatList
        data={filtrados}
        keyExtractor={(insumo) => String(insumo.id)}
        renderItem={({ item }) => <ItemDaLista insumo={item} />}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        refreshing={insumos.isRefetching}
        onRefresh={() => insumos.refetch()}
        ListEmptyComponent={
          <Text style={styles.semResultado}>Nenhum insumo encontrado para “{busca.trim()}”.</Text>
        }
      />

      <View style={styles.rodape}>
        <Botao titulo="Novo insumo" onPress={abrirNovoInsumo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  busca: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: cores.texto,
  },
  lista: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  itemPressionado: {
    opacity: 0.7,
  },
  itemTextos: {
    flex: 1,
    gap: 4,
  },
  itemNome: {
    fontSize: 17,
    fontWeight: '600',
    color: cores.texto,
  },
  itemDetalhe: {
    fontSize: 15,
    color: cores.textoSuave,
  },
  itemSeta: {
    fontSize: 24,
    color: cores.textoSuave,
  },
  semResultado: {
    fontSize: 16,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 32,
  },
  rodape: {
    padding: 16,
    paddingTop: 8,
  },
});
