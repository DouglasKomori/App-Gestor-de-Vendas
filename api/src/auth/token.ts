import jwt from 'jsonwebtoken';

import { env } from '../env';
import { AppError } from '../http/errors';

export const JWT_EXPIRACAO = '7d';

export function gerarToken(userId: number): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: JWT_EXPIRACAO,
    algorithm: 'HS256',
  });
}

/** Valida o token e devolve o id do usuário. Lança AppError 401 se for inválido ou expirado. */
export function verificarToken(token: string): number {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRADO', 'Sua sessão expirou. Faça login novamente.');
    }
    throw new AppError(401, 'TOKEN_INVALIDO', 'Sessão inválida. Faça login novamente.');
  }

  const userId = typeof payload === 'object' ? Number(payload.sub) : Number.NaN;
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError(401, 'TOKEN_INVALIDO', 'Sessão inválida. Faça login novamente.');
  }
  return userId;
}
