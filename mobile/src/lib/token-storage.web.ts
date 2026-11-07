// Versão para o navegador: o expo-secure-store só existe no celular, então o token fica no localStorage.
// O Expo usa este arquivo no lugar de token-storage.ts quando o app roda na web.

const CHAVE = 'auth_token';

export async function lerToken(): Promise<string | null> {
  return localStorage.getItem(CHAVE);
}

export async function salvarToken(token: string): Promise<void> {
  localStorage.setItem(CHAVE, token);
}

export async function apagarToken(): Promise<void> {
  localStorage.removeItem(CHAVE);
}
