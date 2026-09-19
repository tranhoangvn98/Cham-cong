# Build tu thu muc GOC cua repo:  docker build -f mcp/Dockerfile .
#
# Goi NAY doc lap voi may_chu: chi chay may chu MCP (proxy goi REST API cua may_chu).
FROM node:22-alpine AS build
WORKDIR /app

COPY mcp/package.json mcp/package-lock.json* ./
# Cach an toan khi goi chua co package-lock.json (lan dau): npm install.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY mcp ./
RUN npm run build

# Bo phu thuoc dev khoi anh cuoi.
RUN npm prune --omit=dev

# ---------------------------------------------------------------- anh chay
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./

USER node
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/may_chu_mcp.js"]
