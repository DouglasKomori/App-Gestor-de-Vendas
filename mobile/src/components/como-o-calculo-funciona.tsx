import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '@/constants/tema';

// Mesma ordem e fórmulas de api/src/domain/pricing.ts (explicadas também no README).
const PASSOS: { titulo: string; formula: string; explicacao: string }[] = [
  {
    titulo: 'Custo de cada insumo',
    formula: 'preço da embalagem ÷ (quantidade × aproveitamento)',
    explicacao:
      'Farinha de 1 kg por R$ 5,49 custa cerca de R$ 0,0055 por grama. O aproveitamento desconta o que se perde, como cascas.',
  },
  {
    titulo: 'Custo dos ingredientes',
    formula: 'quantidade usada × custo por unidade',
    explicacao:
      'Somado para todos os itens da ficha técnica. Medidas caseiras, como "colher de sopa", viram gramas ou ml pelo valor que você cadastrou no insumo.',
  },
  {
    titulo: 'Custos extras',
    formula: 'ingredientes × percentual de custos extras',
    explicacao: 'Gás, energia e outros gastos difíceis de medir, como um percentual sobre os ingredientes.',
  },
  {
    titulo: 'Mão de obra',
    formula: 'minutos de preparo ÷ 60 × valor da hora',
    explicacao: 'O seu tempo também é custo. Sem ele, o "lucro" inclui o pagamento de quem cozinha.',
  },
  {
    titulo: 'Custo por porção',
    formula: '(ingredientes + extras + mão de obra) ÷ rendimento',
    explicacao: 'Quanto cada porção custa de verdade para você.',
  },
  {
    titulo: 'Preço sugerido',
    formula: 'custo por porção ÷ (1 − margem − taxa de venda)',
    explicacao:
      'A margem é sobre o preço de venda. A taxa de venda é o que a maquininha ou o aplicativo cobram sobre o preço.',
  },
  {
    titulo: 'Lucro com o preço que você cobra',
    formula: 'preço − taxa de venda − custo por porção',
    explicacao:
      'Negativo é prejuízo. Positivo, mas com margem menor que a desejada, fica abaixo da meta. Igual ou maior, na meta.',
  },
];

/** Explicação recolhível das contas que o app faz, com um exemplo de margem x markup. */
export function ComoOCalculoFunciona() {
  const [aberto, setAberto] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        onPress={() => setAberto((valor) => !valor)}
        style={({ pressed }) => [styles.cabecalho, pressed && styles.pressionado]}>
        <Text style={styles.titulo}>Como o cálculo funciona</Text>
        <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={20} color={cores.textoSuave} />
      </Pressable>

      {aberto && (
        <View style={styles.corpo}>
          {PASSOS.map((passo, i) => (
            <View key={passo.titulo} style={styles.passo}>
              <View style={styles.numero}>
                <Text style={styles.numeroTexto}>{i + 1}</Text>
              </View>
              <View style={styles.passoTexto}>
                <Text style={styles.passoTitulo}>{passo.titulo}</Text>
                <Text style={styles.formula}>{passo.formula}</Text>
                <Text style={styles.explicacao}>{passo.explicacao}</Text>
              </View>
            </View>
          ))}

          <View style={styles.exemplo}>
            <Text style={styles.exemploTitulo}>Margem não é markup</Text>
            <Text style={styles.explicacao}>
              Com custo de R$ 6,00 e 40% de margem, o preço é R$ 6,00 ÷ 0,60 = R$ 10,00, e sobram R$ 4,00:
              40% do preço.
            </Text>
            <Text style={styles.explicacao}>
              Já somar 40% ao custo (markup) dá R$ 8,40, e sobram só R$ 2,40: cerca de 29% do preço.
            </Text>
          </View>

          <Text style={styles.nota}>
            Os valores são guardados como decimais exatos e arredondados para centavos só no final. O preço
            sugerido sempre arredonda para cima, para não entregar menos que a margem pedida.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  pressionado: {
    opacity: 0.7,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
  },
  corpo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  passo: {
    flexDirection: 'row',
    gap: 12,
  },
  numero: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexto: {
    color: cores.superficie,
    fontWeight: '700',
    fontSize: 13,
  },
  passoTexto: {
    flex: 1,
    gap: 4,
  },
  passoTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: cores.texto,
  },
  formula: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.primaria,
  },
  explicacao: {
    fontSize: 14,
    lineHeight: 20,
    color: cores.textoSuave,
  },
  exemplo: {
    backgroundColor: cores.fundo,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  exemploTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: cores.texto,
  },
  nota: {
    fontSize: 13,
    lineHeight: 18,
    color: cores.textoSuave,
  },
});
