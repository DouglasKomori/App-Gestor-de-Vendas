import { z } from 'zod';

interface LimitesDoDecimal {
  /** Exige valor maior que zero. */
  positivo?: boolean;
  maximo: number;
  casas: number;
}

interface OpcoesDecimal extends LimitesDoDecimal {
  /** Mensagem quando o campo fica vazio. */
  obrigatorio: string;
}

/** Devolve o texto com ponto, ou o erro para mostrar no campo. */
function lerDecimal(texto: string, { positivo = false, maximo, casas }: LimitesDoDecimal) {
  if (!/^\d+([.,]\d+)?$/.test(texto)) {
    return { erro: 'Digite apenas números, como 5,49.' };
  }

  // No Brasil, "1.500" costuma ser mil e quinhentos; lido como 1,5 o custo sairia mil vezes menor.
  if (/^[1-9]\d{0,2}\.\d{3}$/.test(texto)) {
    return { erro: 'Não use ponto de milhar: escreva 1500, ou 1,5 se for decimal.' };
  }

  const normalizado = texto.replace(',', '.');
  const decimais = normalizado.split('.')[1] ?? '';
  if (decimais.length > casas) {
    return { erro: `Use no máximo ${casas} casas depois da vírgula.` };
  }

  // Number() aqui serve só para comparar com os limites; nenhuma conta é feita com ele.
  const numero = Number(normalizado);
  if (positivo && numero === 0) {
    return { erro: 'Deve ser maior que zero.' };
  }
  if (numero > maximo) {
    return { erro: `O valor máximo é ${String(maximo).replace('.', ',')}.` };
  }
  return { valor: normalizado };
}

/**
 * Campo decimal digitado pelo usuário, aceitando vírgula ou ponto ("5,49" ou "5.49").
 * Devolve o texto com ponto, pronto para enviar à API, que valida tudo de novo.
 */
export function decimalDigitado({ obrigatorio, ...limites }: OpcoesDecimal) {
  return z
    .string()
    .trim()
    .min(1, obrigatorio)
    .transform((texto, ctx) => {
      const { valor, erro } = lerDecimal(texto, limites);
      if (erro !== undefined) {
        ctx.issues.push({ code: 'custom', message: erro, input: texto });
        return z.NEVER;
      }
      return valor;
    });
}

/** Como `decimalDigitado`, mas o campo pode ficar vazio (devolve `null`). */
export function decimalDigitadoOpcional(limites: LimitesDoDecimal) {
  return z
    .string()
    .trim()
    .transform((texto, ctx) => {
      if (texto === '') {
        return null;
      }
      const { valor, erro } = lerDecimal(texto, limites);
      if (erro !== undefined) {
        ctx.issues.push({ code: 'custom', message: erro, input: texto });
        return z.NEVER;
      }
      return valor;
    });
}
