# ── build: full install, generate prisma client, build the web app ──
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
RUN npx -w apps/server prisma generate && npm run build -w apps/web

# ── prod deps: runtime-only node_modules (+ generated prisma client) ──
FROM node:24-alpine AS proddeps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev
COPY apps/server/prisma apps/server/prisma
RUN npx -w apps/server prisma generate

# ── runtime ──
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=proddeps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/engine ./packages/engine
COPY apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
