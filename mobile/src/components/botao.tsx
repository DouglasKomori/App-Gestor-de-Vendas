import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { cores } from '@/constants/tema';

interface BotaoProps {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  carregando?: boolean;
  disabled?: boolean;
}

export function Botao({ titulo, onPress, variante = 'primario', carregando, disabled }: BotaoProps) {
  const primario = variante === 'primario';
  const inativo = disabled || carregando;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primario ? styles.primario : styles.secundario,
        (pressed || inativo) && styles.esmaecido,
      ]}>
      {carregando ? (
        <ActivityIndicator color={primario ? cores.superficie : cores.primaria} />
      ) : (
        <Text style={[styles.texto, primario ? styles.textoPrimario : styles.textoSecundario]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primario: {
    backgroundColor: cores.primaria,
  },
  secundario: {
    backgroundColor: 'transparent',
  },
  esmaecido: {
    opacity: 0.7,
  },
  texto: {
    fontSize: 16,
    fontWeight: '600',
  },
  textoPrimario: {
    color: cores.superficie,
  },
  textoSecundario: {
    color: cores.primaria,
  },
});
