/** URL base da API, definida em mobile/.env (EXPO_PUBLIC_API_URL). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

const TIMEOUT_MS = 5000;

/** Consulta o /health da API. Lança erro com mensagem em português se algo falhar. */
export async function verificarApi(): Promise<void> {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL não está definida. Crie o arquivo mobile/.env.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/health`, { signal: controller.signal });
  } catch {
    throw new Error(
      'Não foi possível conectar. Confira se a API está rodando e se o IP em mobile/.env é o da sua máquina.',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? `A API respondeu com erro ${response.status}.`);
  }
}
