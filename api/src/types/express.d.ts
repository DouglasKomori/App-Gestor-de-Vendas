declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware `autenticar`. Leia sempre com `userIdAutenticado(req)`. */
      userId?: number;
    }
  }
}

export {};
