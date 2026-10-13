# Gestor de Vendas

App de precificação para microempreendedores de alimentos. Quem produz e vende comida em casa
(lanches, doces, marmitas) muitas vezes não sabe quanto cada receita custa de verdade e acaba
vendendo no prejuízo sem perceber. No app, a pessoa:

1. cadastra os **insumos** com o preço pago na embalagem (ex.: farinha, 1 kg por R$ 5,49);
2. monta as **fichas técnicas** das receitas, com os insumos e as quantidades usadas;
3. vê na hora o **custo total**, o **custo por porção** e o **preço de venda sugerido**.

Projeto acadêmico.

## Tecnologias

| Parte | Tecnologias |
| --- | --- |
| App | React Native, Expo SDK 57, TypeScript, Expo Router, TanStack Query, React Hook Form, Zod |
| API | Node.js, Express 5, TypeScript, Prisma 7, Zod, JWT, bcrypt, decimal.js |
| Banco | MySQL 8 (Docker Compose) |
| Testes | Vitest e Supertest |

## Estrutura

```
api/                    API
  prisma/               schema do banco, migrations e seed
  src/domain/pricing.ts regras de cálculo (módulo puro, com testes)
  src/routes/           rotas: auth, insumos, receitas
  src/http/             erros, autenticação e validação
mobile/                 app
  src/app/              telas (cada arquivo é uma rota do Expo Router)
  src/components/       componentes reutilizados pelas telas
  src/hooks/            acesso à API com TanStack Query
  src/schemas/          validação dos formulários
docker-compose.yml      MySQL 8
```

## Pré-requisitos

- [Node.js](https://nodejs.org) 22.13 ou mais novo
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) aberto e rodando
- No celular: o app **Expo Go** (Play Store ou App Store), na mesma rede Wi-Fi do computador

O app foi feito para Android e iOS. A versão web não é suportada.

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
npm run db:seed
npm run dev
```

- `npm run db:migrate` cria as tabelas.
- `npm run db:seed` é opcional: cria uma conta de demonstração com dados de exemplo (veja abaixo).
- O `.env` copiado já funciona, mas troque o `JWT_SECRET` por um valor só seu (o arquivo explica
  como gerar). Sem `JWT_SECRET` a API não sobe.

Quando a API sobe, o terminal mostra os endereços da sua máquina na rede:

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
app Câmera. O app abre na tela de login.

Se mudar o `.env` com o app aberto, recarregue o app (aperte `r` no terminal do Expo).

## Conta de demonstração

`npm run db:seed` (em `api/`) cria esta conta, com 18 insumos e 3 receitas prontas:

| | |
| --- | --- |
| Email | `demo@gestordevendas.app` |
| Senha | `demo12345` |

| Receita | Rende | Custo por porção | Preço sugerido |
| --- | --- | --- | --- |
| Brigadeiro tradicional | 25 | R$ 0,49 | R$ 1,22 |
| Marmita de frango | 5 | R$ 6,94 | R$ 12,62 |
| Bolo de cenoura com cobertura | 12 | R$ 1,25 | R$ 2,50 |

O comando pode ser repetido: ele apaga e recria só a conta de demonstração, sem tocar nas outras.

### Roteiro sugerido para a apresentação

1. Entre com a conta de demonstração e mostre a lista de receitas com custo e preço sugerido.
2. Abra a **Marmita de frango**: custo de cada insumo, custo total, preço sugerido e lucro.
3. Mostre o quadro **Margem ou markup?**: com 45% de margem o preço é R$ 12,62; somando 45% em
   cima do custo seria R$ 10,07, e a margem real cairia para 31,03%.
4. Na aba **Insumos**, abra o **Peito de frango** e mostre o aproveitamento de 85%: o quilo custa
   R$ 22,00, mas só 850 g viram comida.
5. Aumente o preço do frango e volte à receita: custo e preço sugerido mudam sozinhos, porque
   nada é salvo calculado.
6. Crie uma receita nova e mostre o cálculo atualizando enquanto você digita as quantidades.
7. Tente excluir um insumo usado em receita: o app explica em quais receitas ele está.

## Como o cálculo funciona

A lógica fica toda em [`api/src/domain/pricing.ts`](api/src/domain/pricing.ts), um módulo puro que
não depende de Express nem de Prisma.

1. Tudo é convertido para a unidade base: g, ml ou un (kg e L são multiplicados por 1000).
   Massa e volume não se misturam: usar ml em um insumo comprado em kg é erro.
2. **Custo por unidade base** = preço da embalagem ÷ (quantidade da embalagem × aproveitamento).
3. **Custo do item** = quantidade usada × custo por unidade base.
4. **Custo total** = soma dos itens × (1 + custos extras).
5. **Custo por porção** = custo total ÷ rendimento.
6. **Preço sugerido** = custo por porção ÷ (1 − margem). É margem sobre o preço de venda, não
   markup, e vai de 0% a 95%.

Cuidados com dinheiro:

- No banco, preços e quantidades são `DECIMAL`, nunca ponto flutuante.
- Na API, todas as contas usam decimal.js com precisão completa.
- O arredondamento para centavos acontece uma única vez, na resposta da API. O app só formata em
  reais. Por isso a soma dos itens arredondados pode diferir do total em R$ 0,01.
- Os custos nunca são salvos: são recalculados a cada leitura, então mudar o preço de um insumo
  atualiza todas as receitas que o usam.

## Rotas da API

Todas as rotas, exceto `/health`, `/auth/register` e `/auth/login`, exigem o cabeçalho
`Authorization: Bearer <token>`. Cada usuário só enxerga os próprios dados: insumo ou receita de
outra pessoa responde 404.

| Método e rota | O que faz |
| --- | --- |
| `GET /health` | confere se a API e o banco estão no ar |
| `POST /auth/register` | cria a conta (`nome`, `email`, `senha` com 8+ caracteres) e devolve `{ token, user }` |
| `POST /auth/login` | entra (`email`, `senha`) e devolve `{ token, user }` |
| `GET /auth/me` | devolve o usuário dono do token |
| `GET /insumos` | lista os insumos |
| `POST /insumos` | cria um insumo |
| `GET /insumos/:id` | devolve um insumo |
| `PUT /insumos/:id` | atualiza um insumo |
| `DELETE /insumos/:id` | exclui; responde 409 com a lista de receitas se o insumo estiver em uso |
| `GET /receitas` | lista as receitas com custo por porção e preço sugerido |
| `POST /receitas` | cria a receita, com os itens no mesmo corpo |
| `POST /receitas/calcular` | calcula uma receita ainda não salva (usada pelo cálculo em tempo real) |
| `GET /receitas/:id` | devolve a receita com o custo de cada item e o cálculo completo |
| `PUT /receitas/:id` | atualiza a receita e substitui os itens |
| `DELETE /receitas/:id` | exclui a receita e seus itens |

Detalhes:

- O token JWT vale 7 dias. No app ele fica no armazenamento seguro do aparelho
  (`expo-secure-store`), e qualquer resposta 401 desloga.
- Decimais trafegam como texto com ponto (`"5.49"`). No app, a pessoa pode digitar com vírgula.
- Unidades: `G`, `KG`, `ML`, `L` e `UN`.
- Erros seguem sempre o mesmo formato, com mensagens em português:

  ```json
  {
    "error": {
      "code": "DADOS_INVALIDOS",
      "message": "Os dados enviados são inválidos.",
      "details": [{ "campo": "itens.0.unidade", "mensagem": "Não é possível usar \"ml\" (volume) em um insumo comprado em \"kg\" (massa)." }]
    }
  }
  ```

## Testes

```bash
cd api
npm test
```

- `npm run test:unidade`: testes do módulo de cálculo (conversões, aproveitamento, unidades
  incompatíveis, margem, custos extras, arredondamento). Não precisam do banco.
- `npm run test:api`: testes das rotas (autenticação, insumos, receitas e isolamento entre
  usuários). Rodam em um banco separado, `gestor_vendas_test`, criado automaticamente no mesmo
  MySQL; os dados de desenvolvimento nunca são tocados.

## Problemas comuns

| Sintoma | O que verificar |
| --- | --- |
| O app mostra "Não foi possível conectar ao servidor" | A API está rodando (`npm run dev` em `api/`)? O IP em `mobile/.env` é o da sua máquina? Celular e computador estão no mesmo Wi-Fi? |
| No navegador do computador funciona, no celular não | O Firewall do Windows pode estar bloqueando o Node. Permita o acesso em redes privadas quando o Windows perguntar, ou libere a porta 3333. |
| A API não sobe e reclama de variáveis de ambiente | Falta o arquivo `api/.env` ou o `JWT_SECRET` tem menos de 32 caracteres. |
| A API responde "não conseguiu conectar ao banco de dados" | O Docker Desktop está aberto? Rode `docker compose ps` e confira se o MySQL está `healthy`. |
| `docker compose up` reclama da porta 3306 | Já existe um MySQL instalado na máquina usando a porta. Pare esse serviço ou troque a porta no `docker-compose.yml` e em `api/.env`. |
| O Expo Go diz que o projeto é incompatível | Atualize o Expo Go na loja. O projeto usa o SDK 57. |
| O QR code não abre o app | Rode `npx expo start --tunnel`, que funciona mesmo quando a rede bloqueia a conexão direta. |
| `npm run typecheck` no `mobile/` acusa uma rota que existe | Os tipos das rotas são gerados pelo `npx expo start`. Pare e inicie o Expo de novo para regenerá-los. |

## Comandos úteis

| Onde | Comando | Para quê |
| --- | --- | --- |
| raiz | `docker compose up -d` / `docker compose down` | subir / parar o banco |
| raiz | `docker compose down -v` | parar o banco e **apagar todos os dados** |
| `api/` | `npm run dev` | API com recarga automática |
| `api/` | `npm run db:migrate` | aplicar migrations (e criar novas após mudar o schema) |
| `api/` | `npm run db:seed` | criar ou recriar a conta de demonstração |
| `api/` | `npm run db:studio` | abrir o Prisma Studio para ver os dados |
| `api/` | `npm test` | rodar todos os testes (o MySQL precisa estar rodando) |
| `api/` | `npm run typecheck` | checar tipos |
| `mobile/` | `npx expo start` | iniciar o app |
| `mobile/` | `npm run lint` / `npm run typecheck` | lint e checagem de tipos |
