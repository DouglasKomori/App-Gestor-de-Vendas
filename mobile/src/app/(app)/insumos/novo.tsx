import { router } from 'expo-router';

import { FormularioDeInsumo, INSUMO_EM_BRANCO } from '@/components/formulario-de-insumo';
import { useCriarInsumo } from '@/hooks/use-insumos';

export default function NovoInsumo() {
  const criar = useCriarInsumo();

  return (
    <FormularioDeInsumo
      valoresIniciais={INSUMO_EM_BRANCO}
      tituloDoBotao="Salvar insumo"
      onSalvar={async (dados) => {
        await criar.mutateAsync(dados);
        router.back();
      }}
    />
  );
}
