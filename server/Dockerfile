FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY server ./server
COPY shared/contracts ./shared/contracts

WORKDIR /app/server

RUN pnpm install --no-frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8085

EXPOSE 8085

CMD ["node", "dist/index.js"]
