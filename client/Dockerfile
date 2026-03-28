FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY client ./client
COPY shared/contracts ./shared/contracts

ARG VITE_WS_URL=ws://localhost:8085
ENV VITE_WS_URL=$VITE_WS_URL

RUN pnpm --dir /app/shared/contracts install --no-frozen-lockfile
RUN pnpm --dir /app/shared/contracts build

RUN pnpm --dir client install --no-frozen-lockfile
RUN pnpm --dir client build

FROM nginx:1.29-alpine AS runtime

COPY client/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80
