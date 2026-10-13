import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { api, ApiError, definirAoPerderSessao, definirToken } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { apagarToken, lerToken, salvarToken } from '@/lib/token-storage';
import type { Usuario } from '@/schemas/auth';

type Sessao =
  | { status: 'carregando' }
  | { status: 'deslogado' }
  | { status: 'autenticado'; usuario: Usuario }
  // Existe um token salvo, mas não deu para validá-lo porque a API não respondeu.
  | { status: 'sem-conexao' };

interface AuthContextValue {
  sessao: Sessao;
  entrar: (token: string, usuario: Usuario) => Promise<void>;
  sair: () => Promise<void>;
  /** Tenta validar de novo o token salvo (usado na tela de "sem conexão"). */
  tentarNovamente: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return value;
}

/** Lê o token salvo e confirma com a API (GET /auth/me) se ele ainda vale. */
async function restaurarSessao(): Promise<Sessao> {
  let token: string | null;
  try {
    token = await lerToken();
  } catch {
    // Token ilegível (ex.: chave do aparelho invalidada): descarta e pede login de novo.
    await apagarToken().catch(() => {});
    return { status: 'deslogado' };
  }
  if (!token) {
    return { status: 'deslogado' };
  }

  definirToken(token);
  try {
    const { user } = await api<{ user: Usuario }>('/auth/me');
    return { status: 'autenticado', usuario: user };
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 401) {
      definirToken(null);
      await apagarToken();
      return { status: 'deslogado' };
    }
    return { status: 'sem-conexao' };
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [sessao, setSessao] = useState<Sessao>({ status: 'carregando' });

  async function entrar(token: string, usuario: Usuario) {
    await salvarToken(token);
    definirToken(token);
    setSessao({ status: 'autenticado', usuario });
  }

  async function sair() {
    definirToken(null);
    queryClient.clear();
    setSessao({ status: 'deslogado' });
    await apagarToken();
  }

  function tentarNovamente() {
    setSessao({ status: 'carregando' });
    restaurarSessao().then(setSessao);
  }

  useEffect(() => {
    restaurarSessao().then(setSessao);

    // Qualquer 401 em requisição autenticada derruba a sessão e volta para o login.
    definirAoPerderSessao(() => {
      definirToken(null);
      queryClient.clear();
      setSessao({ status: 'deslogado' });
      apagarToken();
    });
    return () => definirAoPerderSessao(null);
  }, []);

  return <AuthContext value={{ sessao, entrar, sair, tentarNovamente }}>{children}</AuthContext>;
}
