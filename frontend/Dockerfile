FROM node:25-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY shared/contracts ./shared/contracts
COPY frontend ./frontend

RUN pnpm --dir /app/shared/contracts install --no-frozen-lockfile
RUN pnpm --dir /app/shared/contracts build

WORKDIR /app/frontend

RUN pnpm install --no-frozen-lockfile
RUN pnpm build

FROM node:25-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/frontend/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
