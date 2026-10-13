// A API envia os decimais como texto ("1234.50"). As funções abaixo formatam esse texto
// direto, sem converter para número, para não reintroduzir erro de ponto flutuante.

/** "1234.5" → "R$ 1.234,50". Espera um valor já arredondado pela API. */
export function formatarMoeda(valor: string): string {
  const negativo = valor.startsWith('-');
  const [inteiro, decimais = ''] = valor.replace('-', '').split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = decimais.padEnd(2, '0').slice(0, 2);
  return `${negativo ? '-' : ''}R$ ${comMilhar},${centavos}`;
}

/** "0.125" → "0,125". Usado para quantidades e percentuais. */
export function formatarDecimal(valor: string): string {
  return valor.replace('.', ',');
}

/** Remove acentos e maiúsculas, para a busca achar "acucar" em "Açúcar". */
export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** "37.50" → "37,5%" e "30.00" → "30%". */
export function formatarPercentual(valor: string): string {
  const semZeros = valor.includes('.') ? valor.replace(/0+$/, '').replace(/\.$/, '') : valor;
  return `${formatarDecimal(semZeros)}%`;
}
