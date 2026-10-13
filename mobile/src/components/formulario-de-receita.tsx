import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AvisoDeErro } from '@/components/aviso-de-erro';
import { Botao } from '@/components/botao';
import { CampoTexto } from '@/components/campo-texto';
import { ResumoDoCalculo } from '@/components/resumo-do-calculo';
import { SeletorDeInsumo } from '@/components/seletor-de-insumo';
import { SeletorDeUnidade } from '@/components/seletor-de-unidade';
import { cores } from '@/constants/tema';
import { useCalculoAoVivo } from '@/hooks/use-receitas';
import { aplicarErrosDaApi } from '@/lib/erros-de-formulario';
import { formatarMoeda } from '@/lib/formato';
import { unidadePadraoNaReceita, unidadesCompativeis } from '@/lib/unidades';
import type { Insumo } from '@/schemas/insumo';
import { receitaSchema, type CamposDaReceita, type DadosDaReceita } from '@/schemas/receita';

export const RECEITA_EM_BRANCO: CamposDaReceita = {
  nome: '',
  rendimentoPorcoes: '',
  margemDesejadaPercentual: '',
  custosExtrasPercentual: '0',
  observacoes: '',
  itens: [],
};

interface FormularioDeReceitaProps {
  valoresIniciais: CamposDaReceita;
  /** Insumos do usuário, para escolher os itens e mostrar seus nomes. */
  insumos: Insumo[];
  tituloDoBotao: string;
  /** Deve rejeitar com o erro da API quando o salvamento falhar. */
  onSalvar: (dados: DadosDaReceita) => Promise<unknown>;
}

export function FormularioDeReceita({
  valoresIniciais,
  insumos,
  tituloDoBotao,
  onSalvar,
}: FormularioDeReceitaProps) {
  // O React Compiler pode memorizar leituras do estado do React Hook Form e deixar a tela
  // desatualizada; este componente fica fora da otimização automática.
  'use no memo';

  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [escolhendoInsumo, setEscolhendoInsumo] = useState(false);

  const { control, handleSubmit, setError, clearErrors, formState } = useForm({
    resolver: zodResolver(receitaSchema),
    defaultValues: valoresIniciais,
  });
  const itens = useFieldArray({ control, name: 'itens' });
  const campos = useWatch({ control });

  // O cálculo acompanha a edição: a cada alteração, a API recalcula a ficha técnica.
  const calculo = useCalculoAoVivo(campos);

  const insumoPorId = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const erroDosItens = formState.errors.itens?.root?.message ?? formState.errors.itens?.message;

  const enviar = handleSubmit(async (dados) => {
    setErroGeral(null);
    try {
      await onSalvar(dados);
    } catch (erro) {
      if (!aplicarErrosDaApi(erro, setError, (campo) => campo.length > 0)) {
        setErroGeral((erro as Error).message);
      }
    }
  });

  function adicionarItem(insumo: Insumo) {
    setEscolhendoInsumo(false);
    clearErrors('itens');
    itens.append({
      insumoId: insumo.id,
      quantidade: '',
      unidade: unidadePadraoNaReceita(insumo.unidadeCompra),
    });
  }

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
              label="Nome da receita"
              placeholder="Ex.: Brigadeiro tradicional"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              autoCapitalize="sentences"
            />
          )}
        />

        <Controller
          control={control}
          name="rendimentoPorcoes"
          render={({ field, fieldState }) => (
            <CampoTexto
              label="Rendimento (porções)"
              placeholder="Ex.: 25"
              ajuda="Quantas unidades ou porções a receita rende."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              keyboardType="number-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="margemDesejadaPercentual"
          render={({ field, fieldState }) => (
            <CampoTexto
              label="Margem desejada (%)"
              placeholder="Ex.: 50"
              ajuda="Quanto do preço de venda você quer que seja lucro. De 0 a 95."
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
          name="custosExtrasPercentual"
          render={({ field, fieldState }) => (
            <CampoTexto
              label="Custos extras (%)"
              ajuda="Gás, energia, embalagem. É somado como percentual sobre o custo dos ingredientes."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              keyboardType="decimal-pad"
            />
          )}
        />

        <View style={styles.secao}>
          <Text style={styles.tituloDaSecao}>Insumos da receita</Text>

          {itens.fields.map((campo, indice) => {
            const insumo = insumoPorId.get(campo.insumoId);
            // Enquanto recalcula, o custo antigo poderia aparecer no item errado; por isso some.
            const custo = calculo.calculando ? undefined : calculo.resultado?.custoPorItem[indice];

            return (
              <View key={campo.id} style={styles.item}>
                <View style={styles.itemCabecalho}>
                  <Text style={styles.itemNome}>{insumo?.nome ?? 'Insumo removido'}</Text>
                  <Botao titulo="Remover" variante="perigo" onPress={() => itens.remove(indice)} />
                </View>

                <Controller
                  control={control}
                  name={`itens.${indice}.quantidade`}
                  render={({ field, fieldState }) => (
                    <CampoTexto
                      label="Quantidade usada"
                      placeholder="Ex.: 200"
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
                  name={`itens.${indice}.unidade`}
                  render={({ field, fieldState }) => (
                    <>
                      <SeletorDeUnidade
                        label="Unidade"
                        valor={field.value}
                        onChange={field.onChange}
                        opcoes={insumo ? unidadesCompativeis(insumo.unidadeCompra) : [field.value]}
                      />
                      {fieldState.error?.message && (
                        <Text style={styles.erro}>{fieldState.error.message}</Text>
                      )}
                    </>
                  )}
                />

                {custo !== undefined && (
                  <Text style={styles.itemCusto}>Custo deste item: {formatarMoeda(custo)}</Text>
                )}
              </View>
            );
          })}

          {itens.fields.length === 0 && (
            <Text style={styles.semItens}>Nenhum insumo adicionado ainda.</Text>
          )}
          {erroDosItens && <Text style={styles.erro}>{erroDosItens}</Text>}

          <Botao
            titulo="+ Adicionar insumo"
            variante="secundario"
            onPress={() => setEscolhendoInsumo(true)}
          />
        </View>

        <View style={styles.secao}>
          <View style={styles.cabecalhoDoCalculo}>
            <Text style={styles.tituloDaSecao}>Cálculo</Text>
            {calculo.calculando && <ActivityIndicator size="small" color={cores.primaria} />}
          </View>

          {calculo.resultado ? (
            <View style={styles.cartao}>
              <ResumoDoCalculo calculo={calculo.resultado.calculo} />
            </View>
          ) : calculo.erro ? (
            <AvisoDeErro mensagem={`Não foi possível calcular agora. ${calculo.erro.message}`} />
          ) : (
            !calculo.calculando && (
              <Text style={styles.semItens}>
                Preencha o rendimento e a margem para ver o custo e o preço sugerido.
              </Text>
            )
          )}
        </View>

        <Controller
          control={control}
          name="observacoes"
          render={({ field, fieldState }) => (
            <CampoTexto
              label="Observações (opcional)"
              placeholder="Modo de preparo, validade, dicas..."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              multiline
              style={styles.observacoes}
            />
          )}
        />

        <Botao titulo={tituloDoBotao} onPress={enviar} carregando={formState.isSubmitting} />
      </ScrollView>

      <SeletorDeInsumo
        visivel={escolhendoInsumo}
        insumos={insumos}
        onEscolher={adicionarItem}
        onFechar={() => setEscolhendoInsumo(false)}
        onCadastrarInsumo={() => {
          setEscolhendoInsumo(false);
          router.push('/insumos/novo');
        }}
      />
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
  secao: {
    gap: 12,
    marginTop: 8,
  },
  tituloDaSecao: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
  },
  item: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  itemCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemNome: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: cores.texto,
  },
  itemCusto: {
    fontSize: 15,
    fontWeight: '600',
    color: cores.texto,
  },
  semItens: {
    fontSize: 15,
    color: cores.textoSuave,
  },
  erro: {
    fontSize: 13,
    color: cores.erro,
  },
  cabecalhoDoCalculo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 16,
  },
  observacoes: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
