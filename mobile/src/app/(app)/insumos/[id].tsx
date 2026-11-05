import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { Carregando, MensagemDeTela } from '@/components/estado-de-tela';
import { FormularioDeInsumo } from '@/components/formulario-de-insumo';
import { useAtualizarInsumo, useExcluirInsumo, useInsumo } from '@/hooks/use-insumos';
import { formatarDecimal } from '@/lib/formato';

export default function EditarInsumo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insumoId = Number(id);

  const insumo = useInsumo(insumoId);
  const atualizar = useAtualizarInsumo(insumoId);
  const excluir = useExcluirInsumo(insumoId);

  // Com o insumo já carregado, uma atualização em segundo plano que falha não fecha o formulário.
  if (insumo.data === undefined) {
    return insumo.isError ? (
      <MensagemDeTela
        titulo="Não foi possível abrir o insumo"
        descricao={insumo.error.message}
        acao={{ titulo: 'Tentar novamente', onPress: () => insumo.refetch() }}
      />
    ) : (
      <Carregando />
    );
  }

  const {
    nome,
    unidadeCompra,
    quantidadeEmbalagem,
    precoEmbalagem,
    aproveitamentoPercentual,
    medidas,
  } = insumo.data;

  function confirmarExclusao() {
    Alert.alert('Excluir insumo', `Excluir "${nome}"? Essa ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          excluir.mutate(undefined, {
            onSuccess: () => router.back(),
            // Ex.: insumo usado em receitas. A API explica quais.
            onError: (erro) => Alert.alert('Não foi possível excluir', erro.message),
          }),
      },
    ]);
  }

  return (
    <FormularioDeInsumo
      valoresIniciais={{
        nome,
        unidadeCompra,
        quantidadeEmbalagem: formatarDecimal(quantidadeEmbalagem),
        precoEmbalagem: formatarDecimal(precoEmbalagem),
        aproveitamentoPercentual: formatarDecimal(aproveitamentoPercentual),
        medidas: medidas.map((medida) => ({
          ...medida,
          quantidade: formatarDecimal(medida.quantidade),
        })),
      }}
      tituloDoBotao="Salvar alterações"
      onSalvar={async (dados) => {
        await atualizar.mutateAsync(dados);
        router.back();
      }}
      onExcluir={confirmarExclusao}
      excluindo={excluir.isPending}
    />
  );
}
