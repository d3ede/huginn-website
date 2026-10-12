FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY prisma ./prisma
RUN npm run db:generate

FROM dependencies AS platform
ENV NODE_ENV=production
COPY --chown=node:node server ./server
COPY --chown=node:node tsconfig.json ./
USER node
EXPOSE 4000
CMD ["node", "--import", "tsx", "server/index.ts"]

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 API_PROXY_ENABLED=false
RUN npm run build

FROM node:22-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
