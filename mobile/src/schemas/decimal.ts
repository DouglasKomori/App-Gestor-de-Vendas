import { z } from 'zod';

interface OpcoesDecimal {
  /** Mensagem quando o campo fica vazio. */
  obrigatorio: string;
  /** Exige valor maior que zero. */
  positivo?: boolean;
  maximo: number;
  casas: number;
}

/**
 * Campo decimal digitado pelo usuário, aceitando vírgula ou ponto ("5,49" ou "5.49").
 * Devolve o texto com ponto, pronto para enviar à API, que valida tudo de novo.
 */
export function decimalDigitado({ obrigatorio, positivo = false, maximo, casas }: OpcoesDecimal) {
  return z
    .string()
    .trim()
    .min(1, obrigatorio)
    .transform((texto, ctx) => {
      const falhar = (message: string) => {
        ctx.issues.push({ code: 'custom', message, input: texto });
        return z.NEVER;
      };

      if (!/^\d+([.,]\d+)?$/.test(texto)) {
        return falhar('Digite apenas números, como 5,49.');
      }

      const normalizado = texto.replace(',', '.');
      const decimais = normalizado.split('.')[1] ?? '';
      if (decimais.length > casas) {
        return falhar(`Use no máximo ${casas} casas depois da vírgula.`);
      }

      // Number() aqui serve só para comparar com os limites; nenhuma conta é feita com ele.
      const numero = Number(normalizado);
      if (positivo && numero === 0) {
        return falhar('Deve ser maior que zero.');
      }
      if (numero > maximo) {
        return falhar(`O valor máximo é ${String(maximo).replace('.', ',')}.`);
      }
      return normalizado;
    });
}
