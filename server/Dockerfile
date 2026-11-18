FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node_modules/.bin/tsx", "src/server.ts"]