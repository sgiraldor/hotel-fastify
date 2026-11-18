# Compilar TS en la plataforma del builder (evita QEMU lento en npm).
# La imagen final sigue siendo linux/arm64 para nodos A1.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S hotel && adduser -S hotel -G hotel

COPY package*.json ./
RUN npm ci --omit=dev --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
  && npm cache clean --force

COPY --from=build /app/dist ./dist

USER hotel

EXPOSE 3000

CMD ["node", "dist/server.js"]
