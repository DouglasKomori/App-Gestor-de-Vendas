import { z } from 'zod';

// As mesmas regras são validadas de novo na API (api/src/routes/auth.ts).

const email = z.string().trim().toLowerCase().pipe(z.email('Digite um email válido.'));

export const loginSchema = z.object({
  email,
  senha: z.string().min(1, 'Digite sua senha.'),
});

export const cadastroSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Digite seu nome.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  email,
  senha: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(72, 'A senha deve ter no máximo 72 caracteres.'),
});

export type DadosDeLogin = z.output<typeof loginSchema>;
export type DadosDeCadastro = z.output<typeof cadastroSchema>;

export interface Usuario {
  id: number;
  nome: string;
  email: string;
}

export interface RespostaDeAutenticacao {
  token: string;
  user: Usuario;
}
