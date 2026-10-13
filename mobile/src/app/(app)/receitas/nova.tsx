import { router } from 'expo-router';

import { Carregando, MensagemDeTela } from '@/components/estado-de-tela';
import { FormularioDeReceita, RECEITA_EM_BRANCO } from '@/components/formulario-de-receita';
import { useInsumos } from '@/hooks/use-insumos';
import { useCriarReceita } from '@/hooks/use-receitas';

export default function NovaReceita() {
  const insumos = useInsumos();
  const criar = useCriarReceita();

  if (insumos.isPending) {
    return <Carregando />;
  }

  if (insumos.isError) {
    return (
      <MensagemDeTela
        titulo="Não foi possível carregar seus insumos"
        descricao={insumos.error.message}
        acao={{ titulo: 'Tentar novamente', onPress: () => insumos.refetch() }}
      />
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
