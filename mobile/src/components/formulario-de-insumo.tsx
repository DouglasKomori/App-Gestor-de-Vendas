import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoDeErro } from '@/components/aviso-de-erro';
import { Botao } from '@/components/botao';
import { CampoTexto } from '@/components/campo-texto';
import { SeletorDeUnidade } from '@/components/seletor-de-unidade';
import { cores } from '@/constants/tema';
import { CONFIRA_OS_CAMPOS, distribuirErroDaApi } from '@/lib/erros-de-formulario';
import { ROTULO_UNIDADE, UNIDADES } from '@/lib/unidades';
import { insumoSchema, type CamposDoInsumo, type DadosDoInsumo } from '@/schemas/insumo';

const CAMPOS: readonly string[] = [
  'nome',
  'unidadeCompra',
  'quantidadeEmbalagem',
  'precoEmbalagem',
  'aproveitamentoPercentual',
];

export const INSUMO_EM_BRANCO: CamposDoInsumo = {
  nome: '',
  unidadeCompra: 'KG',
  quantidadeEmbalagem: '',
  precoEmbalagem: '',
  aproveitamentoPercentual: '100',
};

interface FormularioDeInsumoProps {
  valoresIniciais: CamposDoInsumo;
  tituloDoBotao: string;
  /** Deve rejeitar com o erro da API quando o salvamento falhar. */
  onSalvar: (dados: DadosDoInsumo) => Promise<unknown>;
  /** Quando informado, mostra o botão de excluir (tela de edição). */
  onExcluir?: () => void;
  excluindo?: boolean;
}

export function FormularioDeInsumo({
  valoresIniciais,
  tituloDoBotao,
  onSalvar,
  onExcluir,
  excluindo,
}: FormularioDeInsumoProps) {
  // O React Compiler pode memorizar leituras do estado do React Hook Form e deixar a tela
  // desatualizada; este componente fica fora da otimização automática.
  'use no memo';

  // Guardado como objeto para o efeito abaixo disparar mesmo quando o texto se repete.
  const [erroGeral, setErroGeral] = useState<{ mensagem: string } | null>(null);
  const rolagem = useRef<ScrollViewInstance>(null);
  const margens = useSafeAreaInsets();

  // O aviso fica no topo: rola até ele, para a falha nunca ficar fora da tela.
  useEffect(() => {
    if (erroGeral) {
      rolagem.current?.scrollTo({ y: 0, animated: true });
    }
  }, [erroGeral]);

  function avisar(mensagem: string) {
    setErroGeral({ mensagem });
  }

  const { control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(insumoSchema),
    defaultValues: valoresIniciais,
  });
  const unidade = useWatch({ control, name: 'unidadeCompra' });

  const enviar = handleSubmit(
    async (dados) => {
      setErroGeral(null);
      try {
        await onSalvar(dados);
      } catch (erro) {
        avisar(distribuirErroDaApi(erro, setError, (campo) => CAMPOS.includes(campo)) ?? CONFIRA_OS_CAMPOS);
      }
    },
    () => avisar(CONFIRA_OS_CAMPOS),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.flex}>
      <ScrollView
        ref={rolagem}
        // Espaço extra embaixo para o último botão não ficar sob a barra do sistema.
        contentContainerStyle={[styles.conteudo, { paddingBottom: 20 + margens.bottom }]}
        keyboardShouldPersistTaps="handled">
        {erroGeral && <AvisoDeErro mensagem={erroGeral.mensagem} />}

        <Controller
          control={control}
          name="nome"
          render={({ field, fieldState }) => (
            <CampoTexto
              label="Nome do insumo"
              placeholder="Ex.: Farinha de trigo"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="unidadeCompra"
          render={({ field }) => (
            <SeletorDeUnidade
              label="Como a embalagem é medida?"
              valor={field.value}
              onChange={field.onChange}
              opcoes={UNIDADES}
            />
          )}
        />

        <Controller
          control={control}
          name="quantidadeEmbalagem"
          render={({ field, fieldState }) => (
            <CampoTexto
              label={`Quantidade na embalagem (${ROTULO_UNIDADE[unidade]})`}
              placeholder="Ex.: 1"
              ajuda="Quanto vem na embalagem que você compra."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              keyboardType="decimal-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="precoEmbalagem"
          render={({ field, fieldState }) => (
            <CampoTexto
              label="Preço pago pela embalagem (R$)"
              placeholder="Ex.: 5,49"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              keyboardType="decimal-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="aproveitamentoPercentual"
          render={({ field, fieldState }) => (
            <CampoTexto
              label="Aproveitamento (%)"
              ajuda="Quanto sobra depois de tirar casca, osso ou sementes. Se não há perda, deixe 100."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              keyboardType="decimal-pad"
            />
          )}
        />

        <View style={styles.botoes}>
          <Botao
            titulo={tituloDoBotao}
            onPress={enviar}
            carregando={formState.isSubmitting}
            disabled={excluindo}
          />
          {onExcluir && (
            <Botao
              titulo="Excluir insumo"
              variante="perigo"
              onPress={onExcluir}
              carregando={excluindo}
              disabled={formState.isSubmitting}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: 20,
    gap: 16,
  },
  botoes: {
    gap: 8,
    marginTop: 8,
  },
});
