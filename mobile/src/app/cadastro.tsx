import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AvisoDeErro } from '@/components/aviso-de-erro';
import { Botao } from '@/components/botao';
import { CampoTexto } from '@/components/campo-texto';
import { TelaDeFormulario } from '@/components/tela-de-formulario';
import { cores } from '@/constants/tema';
import { useAuth } from '@/contexts/auth';
import { api, ApiError } from '@/lib/api';
import { cadastroSchema, type DadosDeCadastro, type RespostaDeAutenticacao } from '@/schemas/auth';

export default function Cadastro() {
  const { entrar } = useAuth();

  const { control, handleSubmit, setError } = useForm({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: '', email: '', senha: '' },
  });

  const cadastro = useMutation({
    mutationFn: (dados: DadosDeCadastro) =>
      api<RespostaDeAutenticacao>('/auth/register', { method: 'POST', body: dados }),
    // Ao entrar, a proteção de rotas em _layout.tsx leva para a área logada.
    onSuccess: ({ token, user }) => entrar(token, user),
    onError: (erro) => {
      if (erro instanceof ApiError && erro.code === 'EMAIL_JA_CADASTRADO') {
        setError('email', { message: erro.message });
      }
    },
  });

  const emailJaCadastrado =
    cadastro.error instanceof ApiError && cadastro.error.code === 'EMAIL_JA_CADASTRADO';

  const enviar = handleSubmit((dados) => cadastro.mutate(dados));

  return (
    <TelaDeFormulario>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Criar conta</Text>
        <Text style={styles.subtitulo}>Leva menos de um minuto.</Text>
      </View>

      {cadastro.error && !emailJaCadastrado && <AvisoDeErro mensagem={cadastro.error.message} />}

      <Controller
        control={control}
        name="nome"
        render={({ field, fieldState }) => (
          <CampoTexto
            label="Nome"
            placeholder="Como podemos te chamar?"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={fieldState.error?.message}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <CampoTexto
            label="Email"
            placeholder="voce@exemplo.com"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="senha"
        render={({ field, fieldState }) => (
          <CampoTexto
            label="Senha"
            placeholder="Pelo menos 8 caracteres"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={enviar}
          />
        )}
      />

      <Botao titulo="Criar conta" onPress={enviar} carregando={cadastro.isPending} />

      <View style={styles.rodape}>
        <Text style={styles.textoRodape}>Já tem conta?</Text>
        <Link href="/login" replace style={styles.link}>
          Entrar
        </Link>
      </View>
    </TelaDeFormulario>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: cores.texto,
  },
  subtitulo: {
    fontSize: 16,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  textoRodape: {
    fontSize: 15,
    color: cores.textoSuave,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: cores.primaria,
  },
});
