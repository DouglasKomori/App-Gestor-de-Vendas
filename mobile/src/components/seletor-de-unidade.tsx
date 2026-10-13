import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '@/constants/tema';
import { NOME_UNIDADE, ROTULO_UNIDADE, type Unidade } from '@/lib/unidades';

interface SeletorDeUnidadeProps {
  label: string;
  valor: Unidade;
  onChange: (unidade: Unidade) => void;
  /** Unidades oferecidas, na ordem em que aparecem. */
  opcoes: readonly Unidade[];
}

export function SeletorDeUnidade({ label, valor, onChange, opcoes }: SeletorDeUnidadeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.opcoes}>
        {opcoes.map((unidade) => {
          const selecionada = unidade === valor;
          return (
            <Pressable
              key={unidade}
              accessibilityRole="radio"
              accessibilityLabel={NOME_UNIDADE[unidade]}
              accessibilityState={{ selected: selecionada }}
              onPress={() => onChange(unidade)}
              style={[styles.opcao, selecionada && styles.opcaoSelecionada]}>
              <Text style={[styles.texto, selecionada && styles.textoSelecionado]}>
                {ROTULO_UNIDADE[unidade]}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    gap: 8,
  },
  opcao: {
    flex: 1,
    minHeight: 46,
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
    fontSize: 16,
    fontWeight: '600',
    color: cores.texto,
  },
  textoSelecionado: {
    color: cores.superficie,
  },
});
