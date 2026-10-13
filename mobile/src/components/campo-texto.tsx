import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { cores } from '@/constants/tema';

interface CampoTextoProps extends TextInputProps {
  label: string;
  /** Explicação curta mostrada abaixo do campo (some quando há erro). */
  ajuda?: string;
  erro?: string;
}

export function CampoTexto({ label, ajuda, erro, style, ...props }: CampoTextoProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={cores.textoSuave}
        style={[styles.input, erro && styles.inputComErro, style]}
        {...props}
      />
      {erro ? (
        <Text style={styles.erro}>{erro}</Text>
      ) : (
        ajuda && <Text style={styles.ajuda}>{ajuda}</Text>
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
  input: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: cores.texto,
  },
  inputComErro: {
    borderColor: cores.erro,
  },
  ajuda: {
    fontSize: 13,
    color: cores.textoSuave,
  },
  erro: {
    fontSize: 13,
    color: cores.erro,
  },
});
