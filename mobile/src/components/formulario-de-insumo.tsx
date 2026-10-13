import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AvisoDeErro } from '@/components/aviso-de-erro';
import { Botao } from '@/components/botao';
import { CampoTexto } from '@/components/campo-texto';
import { SeletorDeUnidade } from '@/components/seletor-de-unidade';
import { cores } from '@/constants/tema';
import { aplicarErrosDaApi } from '@/lib/erros-de-formulario';
import { ROTULO_UNIDADE, UNIDADES } from '@/lib/unidades';
import { insumoSchema, type CamposDoInsumo, type DadosDoInsumo } from '@/schemas/insumo';

const CAMPOS = [
  'nome',
  'unidadeCompra',
  'quantidadeEmbalagem',
  'precoEmbalagem',
  'aproveitamentoPercentual',
] as const;

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
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(insumoSchema),
    defaultValues: valoresIniciais,
  });
  const unidade = useWatch({ control, name: 'unidadeCompra' });

  const enviar = handleSubmit(async (dados) => {
    setErroGeral(null);
    try {
      await onSalvar(dados);
    } catch (erro) {
      if (!aplicarErrosDaApi(erro, setError, CAMPOS)) {
        setErroGeral((erro as Error).message);
      }
    }
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.flex}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {erroGeral && <AvisoDeErro mensagem={erroGeral} />}

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
