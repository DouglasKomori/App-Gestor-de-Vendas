import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/constants/tema';
import { formatarMoeda, formatarPercentual } from '@/lib/formato';
import type { ResultadoPraticado } from '@/schemas/receita';

const APARENCIA = {
  PREJUIZO: { fundo: cores.erroFundo, texto: cores.erro },
  ABAIXO_DA_META: { fundo: cores.atencaoFundo, texto: cores.atencao },
  NA_META: { fundo: cores.sucessoFundo, texto: cores.sucesso },
} as const;

/** Valor sem sinal. Um prejuízo real pode arredondar para zero, e "R$ 0,00" pareceria engano. */
function valorDoResultado(valor: string): string {
  return valor === '0.00' ? 'menos de 1 centavo' : formatarMoeda(valor.replace('-', ''));
}

/** Frase curta sobre o preço cobrado hoje, usada também na lista de receitas. */
export function resumoDoPreco({ situacao, lucroPorPorcao }: ResultadoPraticado): string {
  const valor = valorDoResultado(lucroPorPorcao);
  if (situacao === 'PREJUIZO') {
    return `Prejuízo de ${valor} por porção`;
  }
  return situacao === 'ABAIXO_DA_META'
    ? `Lucro de ${valor} por porção, abaixo da meta`
    : `Lucro de ${valor} por porção, dentro da meta`;
}

/** Mostra o que realmente sobra com o preço que a pessoa cobra hoje. */
export function ResultadoDoPreco({ praticado }: { praticado: ResultadoPraticado }) {
  const aparencia = APARENCIA[praticado.situacao];
  const naReceita = valorDoResultado(praticado.lucroPorReceita);

  return (
    <View style={[styles.container, { backgroundColor: aparencia.fundo }]}>
      <Text style={styles.rotulo}>
        Cobrando {formatarMoeda(praticado.precoPorPorcao)} por porção
      </Text>
      <Text style={[styles.titulo, { color: aparencia.texto }]}>{resumoDoPreco(praticado)}</Text>
      <Text style={styles.detalhe}>
        {praticado.situacao === 'PREJUIZO'
          ? `A receita inteira perde ${naReceita}.`
          : `A receita inteira rende ${naReceita} de lucro.`}{' '}
        Margem real de {formatarPercentual(praticado.margemRealPercentual)}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  rotulo: {
    fontSize: 14,
    color: cores.textoSuave,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
  },
  detalhe: {
    fontSize: 14,
    color: cores.texto,
  },
});
