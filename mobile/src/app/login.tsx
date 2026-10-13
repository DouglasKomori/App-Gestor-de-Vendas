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
import { api } from '@/lib/api';
import { loginSchema, type DadosDeLogin, type RespostaDeAutenticacao } from '@/schemas/auth';

export default function Login() {
  const { entrar } = useAuth();

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  });

  const login = useMutation({
    mutationFn: (dados: DadosDeLogin) =>
      api<RespostaDeAutenticacao>('/auth/login', { method: 'POST', body: dados }),
    // Ao entrar, a proteção de rotas em _layout.tsx leva para a área logada.
    onSuccess: ({ token, user }) => entrar(token, user),
  });

  const enviar = handleSubmit((dados) => login.mutate(dados));

  return (
    <TelaDeFormulario>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Gestor de Vendas</Text>
        <Text style={styles.subtitulo}>Entre para ver seus insumos e receitas.</Text>
      </View>

      {login.error && <AvisoDeErro mensagem={login.error.message} />}

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
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={enviar}
          />
        )}
      />

      <Botao titulo="Entrar" onPress={enviar} carregando={login.isPending} />

      <View style={styles.rodape}>
        <Text style={styles.textoRodape}>Ainda não tem conta?</Text>
        <Link href="/cadastro" replace style={styles.link}>
          Criar conta
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
