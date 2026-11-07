# Imagem da API usada no docker-compose.apresentacao.yml.
FROM node:24-slim

WORKDIR /app

# O "npm ci" roda o "prisma generate" (postinstall), que precisa do schema e da config.
COPY package.json package-lock.json prisma7.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .

EXPOSE 3333

# Cria as tabelas, recria a conta de demonstração e sobe a API.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx src/server.ts"]
