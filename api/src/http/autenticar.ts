import type { Request, RequestHandler } from 'express';

import { verificarToken } from '../auth/token';
import { AppError } from './errors';

/** Exige um token válido no cabeçalho `Authorization: Bearer <token>` e guarda o userId na request. */
export const autenticar: RequestHandler = (req, _res, next) => {
  const [tipo, token] = req.headers.authorization?.split(' ') ?? [];

  if (tipo !== 'Bearer' || !token) {
    throw new AppError(401, 'TOKEN_AUSENTE', 'Você precisa fazer login para continuar.');
  }

  req.userId = verificarToken(token);
  next();
};

/**
 * Id do usuário logado. Toda consulta ao banco deve filtrar por ele.
 *
 * Lança erro se a rota não passou pelo `autenticar`: assim um esquecimento vira 401,
 * e não uma consulta sem filtro de usuário.
 */
export function userIdAutenticado(req: Request): number {
  if (req.userId === undefined) {
    throw new AppError(401, 'TOKEN_AUSENTE', 'Você precisa fazer login para continuar.');
  }
  return req.userId;
}
