import * as SecureStore from 'expo-secure-store';

const CHAVE = 'auth_token';

export function lerToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CHAVE);
}

export function salvarToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(CHAVE, token);
}

export function apagarToken(): Promise<void> {
  return SecureStore.deleteItemAsync(CHAVE);
}
