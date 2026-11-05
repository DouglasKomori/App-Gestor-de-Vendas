import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/constants/tema';
import { formatarMoeda } from '@/lib/formato';
import type { Calculo } from '@/schemas/receita';

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={styles.linha}>
      <Text style={[styles.rotulo, destaque && styles.rotuloDestaque]}>{rotulo}</Text>
      <Text style={[styles.valor, destaque && styles.valorDestaque]}>{valor}</Text>
    </View>
  );
}

/** Totais da ficha técnica: do custo dos ingredientes até o preço sugerido e o lucro. */
export function ResumoDoCalculo({ calculo }: { calculo: Calculo }) {
  return (
    <View style={styles.container}>
      <Linha rotulo="Custo dos ingredientes" valor={formatarMoeda(calculo.custoIngredientes)} />
      <Linha rotulo="Custos extras" valor={formatarMoeda(calculo.custoExtras)} />
      <Linha rotulo="Mão de obra" valor={formatarMoeda(calculo.custoMaoDeObra)} />
      <Linha rotulo="Custo total da receita" valor={formatarMoeda(calculo.custoTotal)} />
      <View style={styles.divisor} />
      <Linha rotulo="Custo por porção" valor={formatarMoeda(calculo.custoPorPorcao)} />
      <Linha
        rotulo="Preço sugerido por porção"
        valor={formatarMoeda(calculo.precoSugeridoPorPorcao)}
        destaque
      />
      <Linha rotulo="Taxa de venda por porção" valor={formatarMoeda(calculo.taxaVendaPorPorcao)} />
      <Linha rotulo="Lucro por porção" valor={formatarMoeda(calculo.lucroPorPorcao)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  rotulo: {
    flex: 1,
    fontSize: 15,
    color: cores.textoSuave,
  },
  rotuloDestaque: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.texto,
  },
  valor: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.texto,
    fontVariant: ['tabular-nums'],
  },
  valorDestaque: {
    fontSize: 22,
    fontWeight: '700',
    color: cores.sucesso,
  },
  divisor: {
    height: 1,
    backgroundColor: cores.borda,
    marginVertical: 2,
  },
});
