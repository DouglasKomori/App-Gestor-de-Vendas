import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoDeAtencao, ListaDeAlertas } from '@/components/alertas';
import { AvisoDeErro } from '@/components/aviso-de-erro';
import { Botao } from '@/components/botao';
import { CampoTexto } from '@/components/campo-texto';
import { EscolhaDeMedida } from '@/components/escolha-de-medida';
import { ResultadoDoPreco } from '@/components/resultado-do-preco';
import { ResumoDoCalculo } from '@/components/resumo-do-calculo';
import { SeletorDeInsumo } from '@/components/seletor-de-insumo';
import { cores } from '@/constants/tema';
import { useCalculoAoVivo } from '@/hooks/use-receitas';
import { ApiError } from '@/lib/api';
import { CONFIRA_OS_CAMPOS, distribuirErroDaApi } from '@/lib/erros-de-formulario';
import { formatarDecimal, formatarMoeda } from '@/lib/formato';
import { unidadePadraoNaReceita } from '@/lib/unidades';
import type { Insumo } from '@/schemas/insumo';
import { receitaSchema, type CamposDaReceita, type DadosDaReceita } from '@/schemas/receita';

/** Caminhos em que o formulário sabe mostrar um erro vindo da API. */
const CAMPO_COM_ERRO_VISIVEL =
  /^(nome|rendimentoPorcoes|margemDesejadaPercentual|custosExtrasPercentual|tempoPreparoMinutos|valorHoraTrabalho|taxaVendaPercentual|precoVendaPraticado|observacoes|itens|itens\.\d+\.(quantidade|unidade))$/;

/** Primeira explicação que a API deu para recusar o cálculo, se houver. */
function motivoDoErro(erro: Error): string {
  const [detalhe] = erro instanceof ApiError && Array.isArray(erro.details) ? erro.details : [];
  return detalhe?.mensagem ?? erro.message;
}

export const RECEITA_EM_BRANCO: CamposDaReceita = {
  nome: '',
  rendimentoPorcoes: '',
  margemDesejadaPercentual: '',
  custosExtrasPercentual: '0',
  tempoPreparoMinutos: '',
  valorHoraTrabalho: '',
  taxaVendaPercentual: '',
  precoVendaPraticado: '',
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

  // Guardado como objeto para o efeito abaixo disparar mesmo quando o texto se repete.
  const [erroGeral, setErroGeral] = useState<{ mensagem: string } | null>(null);
  const [escolhendoInsumo, setEscolhendoInsumo] = useState(false);
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

  const { control, handleSubmit, setError, setValue, clearErrors, formState } = useForm({
    resolver: zodResolver(receitaSchema),
    defaultValues: valoresIniciais,
  });
  const itens = useFieldArray({ control, name: 'itens' });
  const campos = useWatch({ control });

  // O cálculo acompanha a edição: a cada alteração, a API recalcula a ficha técnica.
  const calculo = useCalculoAoVivo(campos);

  const insumoPorId = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const erroDosItens = formState.errors.itens?.root?.message ?? formState.errors.itens?.message;

  const enviar = handleSubmit(
    async (dados) => {
      setErroGeral(null);
      try {
        await onSalvar(dados);
      } catch (erro) {
        avisar(
          distribuirErroDaApi(erro, setError, (campo) => CAMPO_COM_ERRO_VISIVEL.test(campo)) ??
            CONFIRA_OS_CAMPOS,
        );
      }
    },
    // O campo inválido pode estar fora da tela: avisa no topo em vez de parecer que nada aconteceu.
    () => avisar(CONFIRA_OS_CAMPOS),
  );

  function adicionarItem(insumo: Insumo) {
    setEscolhendoInsumo(false);
    clearErrors('itens');
    itens.append({
      insumoId: insumo.id,
      quantidade: '',
      unidade: unidadePadraoNaReceita(insumo.unidadeCompra),
      medidaCaseiraId: null,
    });
  }

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
              ajuda="Gás e energia, como percentual sobre os ingredientes. Embalagem cadastre como insumo, para não contar duas vezes."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erro={fieldState.error?.message}
              keyboardType="decimal-pad"
            />
          )}
        />

        <View style={styles.secao}>
          <Text style={styles.tituloDaSecao}>Seu trabalho e suas vendas</Text>

          <Controller
            control={control}
            name="tempoPreparoMinutos"
            render={({ field, fieldState }) => (
              <CampoTexto
                label="Tempo de trabalho (minutos)"
                placeholder="Ex.: 90"
                ajuda="Tempo seu na receita inteira, do preparo à limpeza."
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
            name="valorHoraTrabalho"
            render={({ field, fieldState }) => (
              <CampoTexto
                label="Quanto vale sua hora (R$)"
                placeholder="Ex.: 15,00"
                ajuda="Sem isso, o lucro mostrado ainda inclui o seu pagamento."
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
            name="taxaVendaPercentual"
            render={({ field, fieldState }) => (
              <CampoTexto
                label="Taxa de venda (%)"
                placeholder="Ex.: 4"
                ajuda="Maquininha ou aplicativo de entrega. Confira o percentual no seu contrato. Se vende só no dinheiro ou Pix, deixe vazio."
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
            name="precoVendaPraticado"
            render={({ field, fieldState }) => (
              <CampoTexto
                label="Quanto você cobra hoje por porção (R$)"
                placeholder="Ex.: 2,50"
                ajuda="Opcional. Mostra se esse preço dá lucro de verdade."
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                keyboardType="decimal-pad"
              />
            )}
          />
        </View>

        <View style={styles.secao}>
          <Text style={styles.tituloDaSecao}>Insumos da receita</Text>

          {itens.fields.map((campo, indice) => {
            const insumo = insumoPorId.get(campo.insumoId);
            // Enquanto recalcula (ou logo após remover um item), o custo antigo poderia aparecer
            // no item errado; por isso some até o novo cálculo chegar.
            const custosEmDia =
              !calculo.calculando && campos.itens?.length === itens.fields.length;
            const custo = custosEmDia ? calculo.resultado?.custoPorItem[indice] : undefined;
            const alertasDoItem = custosEmDia ? calculo.resultado?.alertasPorItem[indice] : undefined;
            const itemAtual = campos.itens?.[indice];
            const temPerda = insumo !== undefined && insumo.aproveitamentoPercentual !== '100';

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
                      ajuda={
                        temPerda
                          ? `Use a quantidade já limpa: o aproveitamento de ${formatarDecimal(insumo.aproveitamentoPercentual)}% já cobre a perda.`
                          : undefined
                      }
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
                      {insumo && (
                        <EscolhaDeMedida
                          insumo={insumo}
                          unidade={field.value}
                          medidaCaseiraId={itemAtual?.medidaCaseiraId ?? null}
                          onChange={(unidade, medidaCaseiraId) => {
                            field.onChange(unidade);
                            setValue(`itens.${indice}.medidaCaseiraId`, medidaCaseiraId);
                          }}
                        />
                      )}
                      {fieldState.error?.message && (
                        <Text style={styles.erro}>{fieldState.error.message}</Text>
                      )}
                    </>
                  )}
                />

                {custo !== undefined && (
                  <Text style={styles.itemCusto}>Custo deste item: {formatarMoeda(custo)}</Text>
                )}
                <ListaDeAlertas mensagens={alertasDoItem ?? []} />
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

          {calculo.itensDeFora > 0 && (
            <AvisoDeAtencao
              mensagem={`${calculo.itensDeFora === 1 ? '1 insumo sem quantidade ainda não entra' : `${calculo.itensDeFora} insumos sem quantidade ainda não entram`} na conta: o custo real é maior que o mostrado.`}
            />
          )}

          {calculo.resultado ? (
            <>
              <View style={styles.cartao}>
                <ResumoDoCalculo calculo={calculo.resultado.calculo} />
              </View>
              {calculo.resultado.calculo.praticado && (
                <ResultadoDoPreco praticado={calculo.resultado.calculo.praticado} />
              )}
              <ListaDeAlertas mensagens={calculo.resultado.alertasGerais} />
            </>
          ) : calculo.erro ? (
            <AvisoDeErro mensagem={`Não foi possível calcular agora. ${motivoDoErro(calculo.erro)}`} />
          ) : (
            !calculo.calculando && (
              <Text style={styles.semItens}>
                Preencha os campos acima com valores válidos para ver o custo e o preço sugerido.
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
