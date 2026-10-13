import { Decimal } from 'decimal.js';
import { z } from 'zod';

interface OpcoesDecimal {
  /** Nome do campo com artigo, para as mensagens. Ex.: "O preço da embalagem". */
  nome: string;
  /** Exige valor maior que zero. Sem isso, zero é aceito (negativo nunca é). */
  positivo?: boolean;
  maximo: number;
  /** Número máximo de casas decimais (igual ao da coluna no banco). */
  casas: number;
}

/**
 * Valida um decimal recebido como texto ("5.49") ou número e devolve o texto normalizado.
 * Nunca passa por ponto flutuante: a conferência é feita com decimal.js.
 */
export function decimalSchema({ nome, positivo = false, maximo, casas }: OpcoesDecimal) {
  return z
    .union([z.string(), z.number()], { error: `${nome} é obrigatório.` })
    .transform((valor, ctx) => {
      const falhar = (message: string) => {
        ctx.issues.push({ code: 'custom', message, input: valor });
        return z.NEVER;
      };

      const texto = String(valor).trim();
      if (!/^-?\d+(\.\d+)?$/.test(texto)) {
        return falhar(`${nome} deve ser um número (use ponto como separador decimal).`);
      }

      const decimal = new Decimal(texto);
      if (decimal.isNegative() && !decimal.isZero()) {
        return falhar(`${nome} não pode ser menor que zero.`);
      }
      if (positivo && decimal.isZero()) {
        return falhar(`${nome} deve ser maior que zero.`);
      }
      if (decimal.gt(maximo)) {
        return falhar(`${nome} deve ser no máximo ${maximo}.`);
      }
      if (decimal.decimalPlaces() > casas) {
        return falhar(`${nome} deve ter no máximo ${casas} casas decimais.`);
      }
      return decimal.toString();
    });
}

/** Lê um id numérico de `req.params`. Devolve `null` se não for um inteiro positivo. */
export function lerId(valor: unknown): number | null {
  const id = Number(valor);
  return typeof valor === 'string' && /^\d+$/.test(valor) && Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

export const unidadeSchema = z.enum(['G', 'KG', 'ML', 'L', 'UN'], {
  error: 'Unidade inválida. Use G, KG, ML, L ou UN.',
});
