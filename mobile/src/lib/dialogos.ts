import { Alert, Platform } from 'react-native';

// No navegador o Alert.alert do React Native não mostra nada, então lá usamos os diálogos do próprio navegador.

/** Pede confirmação antes de uma ação destrutiva (ex.: excluir). */
export function confirmarAcao(titulo: string, mensagem: string, textoDoBotao: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) {
      aoConfirmar();
    }
    return;
  }

  Alert.alert(titulo, mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoDoBotao, style: 'destructive', onPress: aoConfirmar },
  ]);
}

/** Mostra um aviso simples, com um botão de OK. */
export function avisar(titulo: string, mensagem: string) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }

  Alert.alert(titulo, mensagem);
}
