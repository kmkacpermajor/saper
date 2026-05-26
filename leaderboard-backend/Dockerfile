FROM node:22-alpine

RUN npm install -g pnpm@10.33.0

WORKDIR /app/server

COPY leaderboard-backend ./

RUN pnpm install --no-frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8090

EXPOSE 8090

CMD ["node", "dist/index.js"]
