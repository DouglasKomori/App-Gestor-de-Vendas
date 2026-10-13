import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { cores } from '@/constants/tema';

interface BotaoProps {
  titulo: string;
  onPress: () => void;
  /** `secundario` e `perigo` são botões só de texto, para ações de menor destaque. */
  variante?: 'primario' | 'secundario' | 'perigo';
  carregando?: boolean;
  disabled?: boolean;
}

const COR_DO_TEXTO = {
  primario: cores.superficie,
  secundario: cores.primaria,
  perigo: cores.erro,
} as const;

export function Botao({ titulo, onPress, variante = 'primario', carregando, disabled }: BotaoProps) {
  const inativo = disabled || carregando;
  const corDoTexto = COR_DO_TEXTO[variante];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variante === 'primario' && styles.primario,
        (pressed || inativo) && styles.esmaecido,
      ]}>
      {carregando ? (
        <ActivityIndicator color={corDoTexto} />
      ) : (
        <Text style={[styles.texto, { color: corDoTexto }]}>{titulo}</Text>
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
  esmaecido: {
    opacity: 0.7,
  },
  texto: {
    fontSize: 16,
    fontWeight: '600',
  },
});
