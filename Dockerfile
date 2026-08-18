# The API imports nothing from packages/*, so it builds standalone from its own
# folder. Set the build context to apps/api (not the repo root) on your host.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
# No package-lock.json here: the workspace root owns the lockfile, so `npm ci`
# has nothing to read. Pin versions in package.json to keep this reproducible.
RUN npm install --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Run as a non-root user. node:alpine ships one already.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node index.js ./
COPY --chown=node:node db.js ./
COPY --chown=node:node init_db.js ./
COPY --chown=node:node config ./config

USER node

# Informational only; the platform decides the real port via PORT.
EXPOSE 5000

# Uses the API's own health endpoint, which also proves the database is reachable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "index.js"]
