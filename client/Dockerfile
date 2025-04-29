# Use Node LTS with Alpine (lightweight)
FROM node:23-slim

WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock ./

# Install all dependencies (including devDependencies)
RUN yarn install --frozen-lockfile --production=false

# Copy all files (except those in .dockerignore)
COPY . .

# Environment variables for Vite
ENV HOST=0.0.0.0
ENV PORT=5173
ENV NODE_ENV=development

# Expose Vite port
EXPOSE 5173

RUN npm i @vitejs/plugin-vue

# Start development server
CMD ["yarn", "dev"]