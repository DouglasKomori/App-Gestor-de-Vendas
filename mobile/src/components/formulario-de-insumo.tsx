import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoDeAtencao } from '@/components/alertas';
import { AvisoDeErro } from '@/components/aviso-de-erro';
import { Botao } from '@/components/botao';
import { CampoTexto } from '@/components/campo-texto';
import { SeletorDeUnidade } from '@/components/seletor-de-unidade';
import { cores } from '@/constants/tema';
import { ApiError } from '@/lib/api';
import { CONFIRA_OS_CAMPOS, distribuirErroDaApi } from '@/lib/erros-de-formulario';
import {
  ROTULO_UNIDADE,
  UNIDADES,
  unidadePadraoNaReceita,
  unidadesCompativeis,
  type Unidade,
} from '@/lib/unidades';
import { insumoSchema, type CamposDoInsumo, type DadosDoInsumo } from '@/schemas/insumo';

/** Caminhos em que o formulário sabe mostrar um erro vindo da API. */
const CAMPO_COM_ERRO_VISIVEL =
  /^(nome|unidadeCompra|quantidadeEmbalagem|precoEmbalagem|aproveitamentoPercentual|medidas\.\d+\.(nome|quantidade|unidade))$/;

const MAXIMO_DE_MEDIDAS = 10;

/** Medidas padronizadas em volume; em massa, o peso depende do ingrediente e fica em branco. */
const SUGESTOES_DE_MEDIDA = [
  { nome: 'Colher de sopa', ml: '15' },
  { nome: 'Colher de chá', ml: '5' },
  { nome: 'Xícara', ml: '240' },
];

export const INSUMO_EM_BRANCO: CamposDoInsumo = {
  nome: '',
  unidadeCompra: 'KG',
  quantidadeEmbalagem: '',
  precoEmbalagem: '',
  aproveitamentoPercentual: '100',
  medidas: [],
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

  const { control, handleSubmit, setError, setValue, getValues, formState } = useForm({
    resolver: zodResolver(insumoSchema),
    defaultValues: valoresIniciais,
  });
  // As medidas têm um campo "id" próprio, que não pode ser trocado pela chave interna da lista.
  const medidas = useFieldArray({ control, name: 'medidas', keyName: 'chave' });
  const unidade = useWatch({ control, name: 'unidadeCompra' });
  const quantidadeEmbalagem = useWatch({ control, name: 'quantidadeEmbalagem' });
  const unidadeDaMedida = unidadePadraoNaReceita(unidade);
  const medidaEmVolume = unidadeDaMedida === 'ML';
  const nomesDasMedidas = medidas.fields.map(({ nome }) => nome);

  // Trocar kg por g sem mudar o número deixa o insumo mil vezes mais caro ou mais barato.
  const quantidadeEsquecida =
    valoresIniciais.quantidadeEmbalagem !== '' &&
    unidade !== valoresIniciais.unidadeCompra &&
    quantidadeEmbalagem === valoresIniciais.quantidadeEmbalagem;

  function trocarUnidade(nova: Unidade, aoMudar: (unidade: Unidade) => void) {
    aoMudar(nova);
    getValues('medidas').forEach((medida, indice) => {
      if (!unidadesCompativeis(nova).includes(medida.unidade)) {
        // "20 g" não vira "20 ml": o valor deixa de valer, e a pessoa precisa informar de novo.
        setValue(`medidas.${indice}.unidade`, unidadePadraoNaReceita(nova));
        setValue(`medidas.${indice}.quantidade`, '');
      }
    });
  }

  function adicionarMedida(nome: string, quantidade: string) {
    medidas.append({ nome, quantidade, unidade: unidadeDaMedida });
  }

  const enviar = handleSubmit(
    async (dados) => {
      setErroGeral(null);
      try {
        await onSalvar(dados);
      } catch (erro) {
        if (erro instanceof ApiError && erro.code === 'MEDIDA_EM_USO') {
          // Sem isso a pessoa não teria como salvar: a medida removida continuaria faltando.
          const presentes = new Set(getValues('medidas').map(({ id }) => id));
          medidas.append(valoresIniciais.medidas.filter(({ id }) => !presentes.has(id)));
          avisar(`${erro.message} A medida voltou para a lista.`);
          return;
        }
        avisar(distribuirErroDaApi(erro, setError, (campo) => CAMPO_COM_ERRO_VISIVEL.test(campo)) ?? CONFIRA_OS_CAMPOS);
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
              onChange={(nova) => trocarUnidade(nova, field.onChange)}
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

        {quantidadeEsquecida && (
          <AvisoDeAtencao
            mensagem={`Você trocou a unidade, mas a quantidade continua ${quantidadeEmbalagem}. Confira se vem mesmo ${quantidadeEmbalagem} ${ROTULO_UNIDADE[unidade]} na embalagem.`}
          />
        )}

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

        <View style={styles.secao}>
          <Text style={styles.tituloDaSecao}>Medidas caseiras (opcional)</Text>
          <Text style={styles.explicacao}>
            Para usar colher, xícara ou &quot;1 cebola&quot; nas receitas.
            {medidaEmVolume
              ? ' Colher e xícara têm volume padrão, já preenchido.'
              : ' Coloque a medida numa balança uma vez e anote o peso: as tabelas divergem (1 colher de sopa de manteiga aparece de 12 a 20 g). Sem balança, use o maior valor.'}
          </Text>

          {medidas.fields.map((campo, indice) => (
            <View key={campo.chave} style={styles.medida}>
              <Controller
                control={control}
                name={`medidas.${indice}.nome`}
                render={({ field, fieldState }) => (
                  <CampoTexto
                    label="Nome da medida"
                    placeholder="Ex.: Colher de sopa"
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
                name={`medidas.${indice}.quantidade`}
                render={({ field, fieldState }) => (
                  <CampoTexto
                    label="Quanto vale 1 medida"
                    placeholder="Ex.: 20"
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
                name={`medidas.${indice}.unidade`}
                render={({ field, fieldState }) => (
                  <>
                    <SeletorDeUnidade
                      label="Em"
                      valor={field.value}
                      onChange={field.onChange}
                      opcoes={unidadesCompativeis(unidade)}
                    />
                    {fieldState.error?.message && (
                      <Text style={styles.erro}>{fieldState.error.message}</Text>
                    )}
                  </>
                )}
              />

              <Botao titulo="Remover medida" variante="perigo" onPress={() => medidas.remove(indice)} />
            </View>
          ))}

          {medidas.fields.length < MAXIMO_DE_MEDIDAS && (
            <>
              {unidade !== 'UN' &&
                SUGESTOES_DE_MEDIDA.filter(({ nome }) => !nomesDasMedidas.includes(nome)).map(
                  ({ nome, ml }) => (
                    <Botao
                      key={nome}
                      titulo={`+ ${nome}`}
                      variante="secundario"
                      onPress={() => adicionarMedida(nome, medidaEmVolume ? ml : '')}
                    />
                  ),
                )}
              <Botao
                titulo="+ Outra medida"
                variante="secundario"
                onPress={() => adicionarMedida('', '')}
              />
            </>
          )}
        </View>

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
  secao: {
    gap: 8,
    marginTop: 8,
  },
  tituloDaSecao: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
  },
  explicacao: {
    fontSize: 14,
    color: cores.textoSuave,
  },
  medida: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  erro: {
    fontSize: 13,
    color: cores.erro,
  },
  botoes: {
    gap: 8,
    marginTop: 8,
  },
});
