FROM node:22-alpine

RUN npm install -g pnpm@10.33.0

WORKDIR /app

COPY game-backend ./server
COPY shared/contracts ./shared/contracts

RUN pnpm --dir /app/shared/contracts install --no-frozen-lockfile
RUN pnpm --dir /app/shared/contracts build

WORKDIR /app/server

RUN pnpm install --no-frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8085

EXPOSE 8085

CMD ["node", "dist/index.js"]
