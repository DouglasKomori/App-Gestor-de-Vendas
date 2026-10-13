# Gestor de Vendas

App de precificação para microempreendedores de alimentos. Quem produz e vende comida em casa
(lanches, doces, marmitas) cadastra os insumos com o preço pago, monta as fichas técnicas das
receitas e o app calcula o custo total, o custo por porção e o preço de venda sugerido.

Projeto acadêmico. Estado atual: **Fase 4** (estrutura, banco, módulo de cálculo de preços com
testes, autenticação completa e cadastro de insumos na API e no app). Faltam as receitas e fichas
técnicas.

## Estrutura

```
api/                  API Node.js + Express + TypeScript + Prisma
  prisma/             schema do banco e migrations
  src/                código da API
mobile/               app React Native + Expo (Expo Router), SDK 57
  src/app/            telas (cada arquivo é uma rota)
docker-compose.yml    MySQL 8
```

## Pré-requisitos

- [Node.js](https://nodejs.org) 22.13 ou mais novo
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) aberto e rodando
- No celular: o app **Expo Go** (Play Store ou App Store), na mesma rede Wi-Fi do computador

## Como rodar

Use três terminais, todos a partir da pasta raiz do projeto.

### 1. Banco de dados

```bash
docker compose up -d
```

Sobe um MySQL 8 na porta 3306 com o banco `gestor_vendas`. Os dados ficam guardados em um volume
do Docker e sobrevivem a reinicializações.

### 2. API

```bash
cd api
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

`npm run db:migrate` cria as tabelas. O `.env` copiado já funciona, mas troque o `JWT_SECRET`
por um valor só seu (o arquivo explica como gerar): sem ele a API não sobe. Quando a API sobe, o terminal mostra os endereços da sua
máquina na rede, por exemplo:

```
API rodando em http://localhost:3333
Para o celular, use o endereço do seu Wi-Fi (normalmente 192.168.x.x ou 10.x.x.x):
  http://192.168.0.10:3333
```

Teste no navegador do computador: <http://localhost:3333/health> deve responder
`{"status":"ok","database":"ok"}`.

### 3. App

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

Antes de iniciar, abra `mobile/.env` e troque o endereço pelo IP da sua máquina:

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:3333
```

> **Atenção:** no celular físico, `localhost` não funciona, porque para o celular "localhost" é o
> próprio celular. Use o IP da máquina na rede local, o mesmo que a API mostra no terminal. Você
> também encontra esse IP com `ipconfig` (Windows) ou `ifconfig` (macOS/Linux).

Depois, leia o QR code que aparece no terminal: no Android, pelo próprio Expo Go; no iPhone, pelo
app Câmera. O app abre na tela de login; toque em "Criar conta" para fazer o primeiro cadastro.

Se mudar o `.env` com o app aberto, recarregue o app (aperte `r` no terminal do Expo).

## Problemas comuns

| Sintoma | O que verificar |
| --- | --- |
| O app mostra "Não foi possível conectar ao servidor" | A API está rodando? O IP em `mobile/.env` é o da sua máquina? Celular e computador estão no mesmo Wi-Fi? |
| No navegador do computador funciona, no celular não | O Firewall do Windows pode estar bloqueando o Node. Permita o acesso em redes privadas quando o Windows perguntar, ou libere a porta 3333. |
| A API responde "não conseguiu conectar ao banco de dados" | O Docker Desktop está aberto? Rode `docker compose ps` e confira se o MySQL está `healthy`. |
| `docker compose up` reclama da porta 3306 | Já existe um MySQL instalado na máquina usando a porta. Pare esse serviço ou troque a porta no `docker-compose.yml` e em `api/.env`. |
| O Expo Go diz que o projeto é incompatível | Atualize o Expo Go na loja. O projeto usa o SDK 57. |
| O QR code não abre o app | Rode `npx expo start --tunnel`, que funciona mesmo quando a rede bloqueia a conexão direta. |

## Comandos úteis

| Onde | Comando | Para quê |
| --- | --- | --- |
| raiz | `docker compose up -d` / `docker compose down` | subir / parar o banco |
| raiz | `docker compose down -v` | parar o banco e **apagar todos os dados** |
| `api/` | `npm run dev` | API com recarga automática |
| `api/` | `npm run db:migrate` | aplicar migrations (e criar novas após mudar o schema) |
| `api/` | `npm run db:studio` | abrir o Prisma Studio para ver os dados |
| `api/` | `npm test` | rodar todos os testes (o MySQL precisa estar rodando) |
| `api/` | `npm run test:unidade` | só os testes do cálculo de preços (não precisa do banco) |
| `api/` | `npm run test:api` | só os testes das rotas, em um banco separado (`gestor_vendas_test`) |
| `api/` | `npm run typecheck` | checar tipos |
| `mobile/` | `npx expo start` | iniciar o app |
| `mobile/` | `npm run lint` / `npm run typecheck` | lint e checagem de tipos |

## Autenticação

- `POST /auth/register` (`nome`, `email`, `senha` com 8+ caracteres) e `POST /auth/login`
  (`email`, `senha`) devolvem `{ token, user }`.
- `GET /auth/me` devolve o usuário dono do token.
- As demais rotas exigem o cabeçalho `Authorization: Bearer <token>`. O token vale 7 dias.
- No app, o token fica guardado no armazenamento seguro do aparelho (`expo-secure-store`).

## Insumos

- `GET /insumos`, `POST /insumos`, `GET /insumos/:id`, `PUT /insumos/:id` e `DELETE /insumos/:id`.
- Campos: `nome`, `unidadeCompra` (`G`, `KG`, `ML`, `L` ou `UN`), `quantidadeEmbalagem`,
  `precoEmbalagem` e `aproveitamentoPercentual` (opcional, padrão 100).
- Valores decimais trafegam como texto com ponto (`"5.49"`), para não perder precisão. No app, a
  pessoa pode digitar com vírgula.
- Cada usuário só enxerga os próprios insumos; o de outra pessoa responde 404.
- Um insumo usado em alguma receita não pode ser excluído: a API responde 409 dizendo em quais
  receitas ele está.

## Padrão de erros da API

Toda resposta de erro segue o mesmo formato, com mensagens em português:

```json
{ "error": { "code": "ROTA_NAO_ENCONTRADA", "message": "Rota GET /x não existe." } }
```
