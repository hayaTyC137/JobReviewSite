# Фронтенд: собираем Vite-проект и раздаём статику через nginx,
# который заодно проксирует /api и OAuth-маршруты на бэкенд
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig*.json ./
COPY public ./public
COPY src ./src
# Демо-данные бэкенда нужны фронтенду для офлайн-режима
COPY backend/src/main/resources/demo ./backend/src/main/resources/demo
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
