# Versão web do app, usada no docker-compose.apresentacao.yml.

# 1) Gera os arquivos do site.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# O navegador chama /api no mesmo endereço do site; o nginx repassa para a API.
ENV EXPO_PUBLIC_API_URL=/api
RUN npx expo export -p web --output-dir dist

# 2) Serve o site com o nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
