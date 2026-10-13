import { router } from 'expo-router';

import { Carregando, MensagemDeTela } from '@/components/estado-de-tela';
import { FormularioDeReceita, RECEITA_EM_BRANCO } from '@/components/formulario-de-receita';
import { useInsumos } from '@/hooks/use-insumos';
import { useCriarReceita } from '@/hooks/use-receitas';

export default function NovaReceita() {
  const insumos = useInsumos();
  const criar = useCriarReceita();

  // Com os insumos já carregados, uma atualização em segundo plano que falha não fecha o
  // formulário (o que apagaria tudo o que a pessoa digitou).
  if (insumos.data === undefined) {
    return insumos.isError ? (
      <MensagemDeTela
        titulo="Não foi possível carregar seus insumos"
        descricao={insumos.error.message}
        acao={{ titulo: 'Tentar novamente', onPress: () => insumos.refetch() }}
      />
    ) : (
      <Carregando />
    );
  }

  return (
    <FormularioDeReceita
      valoresIniciais={RECEITA_EM_BRANCO}
      insumos={insumos.data}
      tituloDoBotao="Salvar receita"
      onSalvar={async (dados) => {
        const receita = await criar.mutateAsync(dados);
        // Troca o formulário pela ficha técnica recém-criada.
        router.replace({ pathname: '/receitas/[id]', params: { id: receita.id } });
      }}
    />
  );
}
