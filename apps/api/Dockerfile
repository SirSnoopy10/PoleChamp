# Obraz API / workera / CLI (IMP-005). Budowanie z katalogu głównego repozytorium:
#   docker build -f apps/api/Dockerfile -t polechamp-api .
# Uruchomienie: domyślnie API; worker: `node dist/worker.js`; migracje: `node dist/cli.js migrate`.
FROM node:26-slim AS build
WORKDIR /repo
RUN npm install -g pnpm@12.14.0
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile \
 && pnpm turbo run build --filter=@polechamp/api... \
 && pnpm --filter @polechamp/api deploy --prod --legacy /out

FROM node:26-slim AS runtime
ENV NODE_ENV=production UV_THREADPOOL_SIZE=8
WORKDIR /app
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --create-home app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/migrations ./migrations
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
