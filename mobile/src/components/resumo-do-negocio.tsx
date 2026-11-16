import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '@/constants/tema';
import { useInsumos } from '@/hooks/use-insumos';
import { useReceitas } from '@/hooks/use-receitas';
import { formatarMoeda } from '@/lib/formato';
import type { ReceitaResumo, ResultadoPraticado } from '@/schemas/receita';

type Situacao = ResultadoPraticado['situacao'];

const SITUACOES: { chave: Situacao; rotulo: string; fundo: string; texto: string }[] = [
  { chave: 'PREJUIZO', rotulo: 'No prejuízo', fundo: cores.erroFundo, texto: cores.erro },
  { chave: 'ABAIXO_DA_META', rotulo: 'Abaixo da meta', fundo: cores.atencaoFundo, texto: cores.atencao },
  { chave: 'NA_META', rotulo: 'Na meta', fundo: cores.sucessoFundo, texto: cores.sucesso },
];

/** Receita com o maior (ou menor) lucro por porção, entre as que têm preço praticado. */
function extremo(receitas: ReceitaResumo[], maior: boolean) {
  let escolhida: ReceitaResumo | null = null;
  for (const receita of receitas) {
    if (!receita.praticado) continue;
    const lucro = Number(receita.praticado.lucroPorPorcao);
    const atual = escolhida?.praticado ? Number(escolhida.praticado.lucroPorPorcao) : null;
    if (atual === null || (maior ? lucro > atual : lucro < atual)) escolhida = receita;
  }
  return escolhida;
}

function abrirReceita(id: number) {
  router.push({ pathname: '/receitas/[id]', params: { id } });
}

function Numero({ valor, rotulo, onPress }: { valor: number; rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${valor} ${rotulo}`}
      onPress={onPress}
      style={({ pressed }) => [styles.numero, pressed && styles.pressionado]}>
      <Text style={styles.numeroValor}>{valor}</Text>
      <Text style={styles.numeroRotulo}>{rotulo}</Text>
    </Pressable>
  );
}

function Destaque({ titulo, receita, cor }: { titulo: string; receita: ReceitaResumo; cor: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre a ficha técnica da receita"
      onPress={() => abrirReceita(receita.id)}
      style={({ pressed }) => [styles.destaque, pressed && styles.pressionado]}>
      <Text style={styles.destaqueTitulo}>{titulo}</Text>
      <Text style={styles.destaqueNome}>{receita.nome}</Text>
      <Text style={[styles.destaqueValor, { color: cor }]}>
        {formatarMoeda(receita.praticado!.lucroPorPorcao)} de lucro por porção
      </Text>
    </Pressable>
  );
}

/** Visão geral do negócio: quantidades e como estão os preços praticados das receitas. */
export function ResumoDoNegocio() {
  const insumos = useInsumos();
  const receitas = useReceitas();

  if (insumos.data === undefined || receitas.data === undefined) {
    const erro = insumos.error ?? receitas.error;
    return (
      <View style={styles.card}>
        <Text style={styles.titulo}>Resumo do negócio</Text>
        {erro ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              insumos.refetch();
              receitas.refetch();
            }}>
            <Text style={styles.textoSuave}>Não foi possível carregar o resumo. Toque para tentar de novo.</Text>
          </Pressable>
        ) : (
          <ActivityIndicator color={cores.primaria} style={styles.carregando} />
        )}
      </View>
    );
  }

  const lista = receitas.data;
  const comPreco = lista.filter((receita) => receita.praticado !== null);
  const semPreco = lista.length - comPreco.length;
  const contagem = (situacao: Situacao) =>
    comPreco.filter((receita) => receita.praticado!.situacao === situacao).length;

  const melhor = extremo(lista, true);
  const pior = extremo(lista, false);
  const piorNoPrejuizo = pior?.praticado?.situacao === 'PREJUIZO' && pior.id !== melhor?.id;

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Resumo do negócio</Text>

      <View style={styles.numeros}>
        <Numero valor={insumos.data.length} rotulo="insumos" onPress={() => router.push('/insumos')} />
        <Numero valor={lista.length} rotulo="receitas" onPress={() => router.push('/')} />
      </View>

      {comPreco.length > 0 ? (
        <>
          <Text style={styles.subtitulo}>Preço que você cobra hoje</Text>
          <View style={styles.situacoes}>
            {SITUACOES.map(({ chave, rotulo, fundo, texto }) => (
              <View key={chave} style={[styles.situacao, { backgroundColor: fundo }]}>
                <Text style={[styles.situacaoValor, { color: texto }]}>{contagem(chave)}</Text>
                <Text style={[styles.situacaoRotulo, { color: texto }]}>{rotulo}</Text>
              </View>
            ))}
          </View>
          {semPreco > 0 && (
            <Text style={styles.textoSuave}>
              {semPreco === 1
                ? '1 receita ainda não tem o preço que você cobra.'
                : `${semPreco} receitas ainda não têm o preço que você cobra.`}
            </Text>
          )}

          {melhor && <Destaque titulo="Mais lucrativa" receita={melhor} cor={cores.sucesso} />}
          {piorNoPrejuizo && pior && <Destaque titulo="Precisa de atenção" receita={pior} cor={cores.erro} />}
        </>
      ) : (
        <Text style={styles.textoSuave}>
          {lista.length === 0
            ? 'Cadastre uma receita para ver aqui como estão os seus preços.'
            : 'Informe nas receitas o preço que você cobra hoje para ver se está lucrando.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
  },
  subtitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.textoSuave,
  },
  textoSuave: {
    fontSize: 14,
    color: cores.textoSuave,
  },
  carregando: {
    alignSelf: 'flex-start',
  },
  pressionado: {
    opacity: 0.7,
  },
  numeros: {
    flexDirection: 'row',
    gap: 12,
  },
  numero: {
    flex: 1,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    padding: 12,
  },
  numeroValor: {
    fontSize: 28,
    fontWeight: '700',
    color: cores.texto,
  },
  numeroRotulo: {
    fontSize: 14,
    color: cores.textoSuave,
  },
  situacoes: {
    flexDirection: 'row',
    gap: 8,
  },
  situacao: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  situacaoValor: {
    fontSize: 22,
    fontWeight: '700',
  },
  situacaoRotulo: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  destaque: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  destaqueTitulo: {
    fontSize: 12,
    fontWeight: '600',
    color: cores.textoSuave,
    textTransform: 'uppercase',
  },
  destaqueNome: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.texto,
  },
  destaqueValor: {
    fontSize: 14,
    fontWeight: '600',
  },
});
