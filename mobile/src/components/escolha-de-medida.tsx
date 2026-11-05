import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '@/constants/tema';
import { formatarDecimal } from '@/lib/formato';
import { NOME_UNIDADE, ROTULO_UNIDADE, unidadesCompativeis, type Unidade } from '@/lib/unidades';
import type { Insumo } from '@/schemas/insumo';

interface EscolhaDeMedidaProps {
  insumo: Insumo;
  unidade: Unidade;
  medidaCaseiraId: number | null;
  onChange: (unidade: Unidade, medidaCaseiraId: number | null) => void;
}

interface OpcaoProps {
  texto: string;
  acessibilidade: string;
  selecionada: boolean;
  onPress: () => void;
}

function Opcao({ texto, acessibilidade, selecionada, onPress }: OpcaoProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={acessibilidade}
      accessibilityState={{ selected: selecionada }}
      onPress={onPress}
      style={[styles.opcao, selecionada && styles.opcaoSelecionada]}>
      <Text style={[styles.texto, selecionada && styles.textoSelecionado]}>{texto}</Text>
    </Pressable>
  );
}

/** Como a quantidade do item é medida: uma unidade compatível ou uma medida caseira do insumo. */
export function EscolhaDeMedida({ insumo, unidade, medidaCaseiraId, onChange }: EscolhaDeMedidaProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Medida</Text>
      <View accessibilityRole="radiogroup" style={styles.opcoes}>
        {unidadesCompativeis(insumo.unidadeCompra).map((opcao) => (
          <Opcao
            key={opcao}
            texto={ROTULO_UNIDADE[opcao]}
            acessibilidade={NOME_UNIDADE[opcao]}
            selecionada={medidaCaseiraId === null && opcao === unidade}
            onPress={() => onChange(opcao, null)}
          />
        ))}
        {insumo.medidas.map((medida) => {
          const valor = `${formatarDecimal(medida.quantidade)} ${ROTULO_UNIDADE[medida.unidade]}`;
          return (
            <Opcao
              key={medida.id}
              texto={`${medida.nome} (${valor})`}
              acessibilidade={`${medida.nome}, ${valor}`}
              selecionada={medidaCaseiraId === medida.id}
              onPress={() => onChange(medida.unidade, medida.id)}
            />
          );
        })}
      </View>
      {insumo.medidas.length === 0 && (
        <Text style={styles.ajuda}>
          Vai usar colher ou xícara? Cadastre a medida na tela do insumo.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.texto,
  },
  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  opcao: {
    minHeight: 46,
    minWidth: 56,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  opcaoSelecionada: {
    borderColor: cores.primaria,
    backgroundColor: cores.primaria,
  },
  texto: {
    fontSize: 15,
    fontWeight: '600',
    color: cores.texto,
  },
  textoSelecionado: {
    color: cores.superficie,
  },
  ajuda: {
    fontSize: 13,
    color: cores.textoSuave,
  },
});
