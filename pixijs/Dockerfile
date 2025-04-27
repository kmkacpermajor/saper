# Stage 1: Build
FROM node:23-slim AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# Stage 2: Run (dev server)
FROM node:23-slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5173
CMD ["yarn", "dev"]