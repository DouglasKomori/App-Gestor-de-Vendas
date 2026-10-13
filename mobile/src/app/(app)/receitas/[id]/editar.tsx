import { router, useLocalSearchParams } from 'expo-router';

import { Carregando, MensagemDeTela } from '@/components/estado-de-tela';
import { FormularioDeReceita } from '@/components/formulario-de-receita';
import { useInsumos } from '@/hooks/use-insumos';
import { useAtualizarReceita, useReceita } from '@/hooks/use-receitas';
import { formatarDecimal } from '@/lib/formato';

export default function EditarReceita() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receitaId = Number(id);

  const receita = useReceita(receitaId);
  const insumos = useInsumos();
  const atualizar = useAtualizarReceita(receitaId);

  // Com os dados já carregados, uma atualização em segundo plano que falha não fecha o
  // formulário (o que apagaria tudo o que a pessoa digitou).
  if (receita.data === undefined || insumos.data === undefined) {
    return receita.isError || insumos.isError ? (
      <MensagemDeTela
        titulo="Não foi possível abrir a receita"
        descricao={(receita.error ?? insumos.error)?.message}
        acao={{
          titulo: 'Tentar novamente',
          onPress: () => {
            receita.refetch();
            insumos.refetch();
          },
        }}
      />
    ) : (
      <Carregando />
    );
  }

  const dados = receita.data;

  return (
    <FormularioDeReceita
      valoresIniciais={{
        nome: dados.nome,
        rendimentoPorcoes: String(dados.rendimentoPorcoes),
        margemDesejadaPercentual: formatarDecimal(dados.margemDesejadaPercentual),
        custosExtrasPercentual: formatarDecimal(dados.custosExtrasPercentual),
        observacoes: dados.observacoes ?? '',
        itens: dados.itens.map((item) => ({
          insumoId: item.insumoId,
          quantidade: formatarDecimal(item.quantidade),
          unidade: item.unidade,
        })),
      }}
      insumos={insumos.data}
      tituloDoBotao="Salvar alterações"
      onSalvar={async (novosDados) => {
        await atualizar.mutateAsync(novosDados);
        router.back();
      }}
    />
  );
}
