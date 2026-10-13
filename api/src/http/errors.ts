import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

/** Erro esperado da aplicação, devolvido como `{ error: { code, message, details? } }`. */
export class AppError extends Error {
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

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'ROTA_NAO_ENCONTRADA', `Rota ${req.method} ${req.path} não existe.`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'DADOS_INVALIDOS',
        message: 'Os dados enviados são inválidos.',
        details: err.issues.map((issue) => ({
          campo: issue.path.join('.'),
          mensagem: issue.message,
        })),
      },
    });
    return;
  }

  // Corpo da requisição com JSON malformado (erro do express.json()).
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'JSON_INVALIDO', message: 'O corpo da requisição não é um JSON válido.' },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: { code: 'ERRO_INTERNO', message: 'Ocorreu um erro inesperado. Tente novamente.' },
  });
};
