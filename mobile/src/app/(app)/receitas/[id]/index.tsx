import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Carregando, MensagemDeTela } from '@/components/estado-de-tela';
import { ResumoDoCalculo } from '@/components/resumo-do-calculo';
import { cores } from '@/constants/tema';
import { useExcluirReceita, useReceita } from '@/hooks/use-receitas';
import { formatarDecimal, formatarMoeda, formatarPercentual } from '@/lib/formato';
import { ROTULO_UNIDADE } from '@/lib/unidades';

export default function DetalheDaReceita() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receitaId = Number(id);

  const receita = useReceita(receitaId);
  const excluir = useExcluirReceita(receitaId);
  const margens = useSafeAreaInsets();

  // Com a receita já carregada, uma atualização em segundo plano que falha não troca a tela.
  if (receita.data === undefined) {
    return receita.isError ? (
      <MensagemDeTela
        titulo="Não foi possível abrir a receita"
        descricao={receita.error.message}
        acao={{ titulo: 'Tentar novamente', onPress: () => receita.refetch() }}
      />
    ) : (
      <Carregando />
    );
  }

  const { nome, rendimentoPorcoes, margemDesejadaPercentual, custosExtrasPercentual, observacoes, itens, calculo } =
    receita.data;
  const margem = formatarPercentual(margemDesejadaPercentual);
  const porcoes = rendimentoPorcoes === 1 ? '1 porção' : `${rendimentoPorcoes} porções`;

  function confirmarExclusao() {
    Alert.alert('Excluir receita', `Excluir "${nome}"? Essa ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          excluir.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: (erro) => Alert.alert('Não foi possível excluir', erro.message),
          }),
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      // Espaço extra embaixo para o último botão não ficar sob a barra do sistema.
      contentContainerStyle={[styles.conteudo, { paddingBottom: 16 + margens.bottom }]}>
      <View style={styles.cabecalho}>
        <Text style={styles.nome}>{nome}</Text>
        <Text style={styles.detalhe}>
          Rende {porcoes} · margem de {margem} · custos extras de{' '}
          {formatarPercentual(custosExtrasPercentual)}
        </Text>
      </View>

      <View style={styles.destaque}>
        <Text style={styles.destaqueRotulo}>Preço sugerido por porção</Text>
        <Text style={styles.destaqueValor}>{formatarMoeda(calculo.precoSugeridoPorPorcao)}</Text>
        <Text style={styles.destaqueDetalhe}>
          Custo de {formatarMoeda(calculo.custoPorPorcao)} e lucro de{' '}
          {formatarMoeda(calculo.lucroPorPorcao)} por porção
        </Text>
      </View>

      <View style={styles.cartao}>
        <Text style={styles.titulo}>Custo por insumo</Text>
        {itens.map((item) => (
          <View key={item.id} style={styles.linhaDoItem}>
            <View style={styles.itemTextos}>
              <Text style={styles.itemNome}>{item.insumoNome}</Text>
              <Text style={styles.itemQuantidade}>
                {formatarDecimal(item.quantidade)} {ROTULO_UNIDADE[item.unidade]}
              </Text>
            </View>
            <Text style={styles.itemCusto}>{formatarMoeda(item.custo)}</Text>
          </View>
        ))}
        <View style={styles.divisor} />
        <ResumoDoCalculo calculo={calculo} />
        <Text style={styles.nota}>
          Valores arredondados para centavos. A soma dos itens pode diferir do total em R$ 0,01.
        </Text>
      </View>

      <View style={styles.cartao}>
        <Text style={styles.titulo}>Margem ou markup?</Text>
        <Text style={styles.explicacao}>
          Você pediu {margem} de <Text style={styles.forte}>margem</Text>: de cada venda, {margem}{' '}
          é lucro. Somar {margem} em cima do custo (<Text style={styles.forte}>markup</Text>) parece
          a mesma coisa, mas rende menos.
        </Text>

        <View style={styles.comparacao}>
          <View style={[styles.coluna, styles.colunaCerta]}>
            <Text style={styles.colunaTitulo}>Com margem</Text>
            <Text style={styles.colunaPreco}>{formatarMoeda(calculo.precoSugeridoPorPorcao)}</Text>
            <Text style={styles.colunaDetalhe}>
              Lucro de {formatarMoeda(calculo.lucroPorPorcao)}
            </Text>
            <Text style={styles.colunaDetalhe}>Margem real de {margem}</Text>
          </View>
          <View style={styles.coluna}>
            <Text style={styles.colunaTitulo}>Com markup</Text>
            <Text style={styles.colunaPreco}>{formatarMoeda(calculo.markup.precoPorPorcao)}</Text>
            <Text style={styles.colunaDetalhe}>
              Lucro de {formatarMoeda(calculo.markup.lucroPorPorcao)}
            </Text>
            <Text style={styles.colunaDetalhe}>
              Margem real de {formatarPercentual(calculo.markup.margemRealPercentual)}
            </Text>
          </View>
        </View>
      </View>

      {observacoes && (
        <View style={styles.cartao}>
          <Text style={styles.titulo}>Observações</Text>
          <Text style={styles.explicacao}>{observacoes}</Text>
        </View>
      )}

      <View style={styles.botoes}>
        <Botao
          titulo="Editar receita"
          onPress={() =>
            router.push({ pathname: '/receitas/[id]/editar', params: { id: receitaId } })
          }
          disabled={excluir.isPending}
        />
        <Botao
          titulo="Excluir receita"
          variante="perigo"
          onPress={confirmarExclusao}
          carregando={excluir.isPending}
        />
      </View>
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
  cabecalho: {
    gap: 4,
  },
  nome: {
    fontSize: 24,
    fontWeight: '700',
    color: cores.texto,
  },
  detalhe: {
    fontSize: 15,
    color: cores.textoSuave,
  },
  destaque: {
    backgroundColor: cores.sucesso,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  destaqueRotulo: {
    fontSize: 15,
    color: cores.superficie,
  },
  destaqueValor: {
    fontSize: 36,
    fontWeight: '700',
    color: cores.superficie,
  },
  destaqueDetalhe: {
    fontSize: 14,
    color: cores.superficie,
    textAlign: 'center',
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
  },
  linhaDoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemTextos: {
    flex: 1,
    gap: 2,
  },
  itemNome: {
    fontSize: 16,
    color: cores.texto,
  },
  itemQuantidade: {
    fontSize: 14,
    color: cores.textoSuave,
  },
  itemCusto: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.texto,
    fontVariant: ['tabular-nums'],
  },
  divisor: {
    height: 1,
    backgroundColor: cores.borda,
  },
  nota: {
    fontSize: 12,
    color: cores.textoSuave,
  },
  explicacao: {
    fontSize: 15,
    lineHeight: 22,
    color: cores.texto,
  },
  forte: {
    fontWeight: '700',
  },
  comparacao: {
    flexDirection: 'row',
    gap: 12,
  },
  coluna: {
    flex: 1,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  colunaCerta: {
    borderColor: cores.sucesso,
    borderWidth: 2,
  },
  colunaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.textoSuave,
  },
  colunaPreco: {
    fontSize: 20,
    fontWeight: '700',
    color: cores.texto,
  },
  colunaDetalhe: {
    fontSize: 13,
    color: cores.textoSuave,
  },
  botoes: {
    gap: 8,
  },
});
