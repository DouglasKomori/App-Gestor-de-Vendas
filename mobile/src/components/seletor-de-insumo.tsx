import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { MensagemDeTela } from '@/components/estado-de-tela';
import { cores } from '@/constants/tema';
import { formatarDecimal, formatarMoeda, normalizarParaBusca } from '@/lib/formato';
import { ROTULO_UNIDADE } from '@/lib/unidades';
import type { Insumo } from '@/schemas/insumo';

interface SeletorDeInsumoProps {
  visivel: boolean;
  insumos: Insumo[];
  onEscolher: (insumo: Insumo) => void;
  onFechar: () => void;
  /** Chamado quando a pessoa ainda não tem insumos e quer cadastrar o primeiro. */
  onCadastrarInsumo: () => void;
}

/** Janela para escolher, com busca, o insumo que entra na receita. */
export function SeletorDeInsumo({
  visivel,
  insumos,
  onEscolher,
  onFechar,
  onCadastrarInsumo,
}: SeletorDeInsumoProps) {
  const [busca, setBusca] = useState('');

  const termo = normalizarParaBusca(busca);
  const filtrados = insumos.filter((insumo) => normalizarParaBusca(insumo.nome).includes(termo));

  function fechar() {
    setBusca('');
    onFechar();
  }

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={fechar}>
      <SafeAreaView style={styles.container}>
        <View style={styles.cabecalho}>
          <Text style={styles.titulo}>Escolha um insumo</Text>
          <Botao titulo="Fechar" variante="secundario" onPress={fechar} />
        </View>

        {insumos.length === 0 ? (
          <MensagemDeTela
            titulo="Nenhum insumo cadastrado"
            descricao="Cadastre primeiro os insumos que você compra. Depois eles aparecem aqui para montar a receita."
            acao={{ titulo: 'Cadastrar insumo', onPress: onCadastrarInsumo }}
          />
        ) : (
          <>
            <TextInput
              accessibilityLabel="Buscar insumo"
              placeholder="Buscar insumo"
              placeholderTextColor={cores.textoSuave}
              value={busca}
              onChangeText={setBusca}
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={styles.busca}
            />
            <FlatList
              data={filtrados}
              keyExtractor={(insumo) => String(insumo.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.lista}
              renderItem={({ item: insumo }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setBusca('');
                    onEscolher(insumo);
                  }}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressionado]}>
                  <Text style={styles.itemNome}>{insumo.nome}</Text>
                  <Text style={styles.itemDetalhe}>
                    {formatarDecimal(insumo.quantidadeEmbalagem)}{' '}
                    {ROTULO_UNIDADE[insumo.unidadeCompra]} por{' '}
                    {formatarMoeda(insumo.precoEmbalagem)}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.semResultado}>
                  Nenhum insumo encontrado para “{busca.trim()}”.
                </Text>
              }
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingTop: 8,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: cores.texto,
  },
  busca: {
    margin: 16,
    marginTop: 8,
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
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  itemPressionado: {
    opacity: 0.7,
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
  semResultado: {
    fontSize: 16,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 32,
  },
});
