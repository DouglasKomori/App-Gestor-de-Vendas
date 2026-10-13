/** URL base da API, definida em mobile/.env (EXPO_PUBLIC_API_URL). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

const TIMEOUT_MS = 10000;

/** Erro devolvido pela API (`{ error: { code, message, details? } }`) ou falha de conexão (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let token: string | null = null;
let aoPerderSessao: (() => void) | null = null;

/** Token enviado em todas as requisições. Passe `null` para deslogar. */
export function definirToken(novoToken: string | null) {
  token = novoToken;
}

/** Chamado quando a API responde 401 a uma requisição autenticada (token inválido ou expirado). */
export function definirAoPerderSessao(callback: (() => void) | null) {
  aoPerderSessao = callback;
}

interface OpcoesDaRequisicao {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function api<T>(caminho: string, opcoes: OpcoesDaRequisicao = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, 'SEM_CONFIGURACAO', 'EXPO_PUBLIC_API_URL não está definida em mobile/.env.');
  }

  const tokenEnviado = token;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${caminho}`, {
      method: opcoes.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opcoes.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(tokenEnviado && { Authorization: `Bearer ${tokenEnviado}` }),
      },
      body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      0,
      'SEM_CONEXAO',
      'Não foi possível conectar ao servidor. Confira sua internet e tente de novo.',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const corpo = await response.json().catch(() => null);

  if (!response.ok) {
    // Só desloga se a requisição foi feita com token: login com senha errada também é 401.
    if (response.status === 401 && tokenEnviado) {
      aoPerderSessao?.();
    }
    throw new ApiError(
      response.status,
      corpo?.error?.code ?? 'ERRO_DESCONHECIDO',
      corpo?.error?.message ?? 'Ocorreu um erro inesperado. Tente novamente.',
      corpo?.error?.details,
    );
  }

  return corpo as T;
}
