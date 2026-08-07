# Build tu thu muc GOC cua repo:  docker build -f may_chu/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

# Cai phu thuoc truoc, tan dung cache khi ma nguon doi ma phu thuoc khong doi.
COPY package.json package-lock.json ./
COPY may_chu/package.json ./may_chu/
COPY web/package.json ./web/
RUN npm ci --workspace may_chu --include-workspace-root

COPY may_chu ./may_chu
RUN npm run --workspace may_chu build

# Bo phu thuoc dev khoi anh cuoi.
RUN npm prune --omit=dev --workspace may_chu --include-workspace-root

# npm workspaces keo (hoist) phu thuoc len /app/node_modules; /app/may_chu/node_modules
# CHI ton tai khi co xung dot phien ban buoc phai long vao trong. Voi bo phu thuoc hien
# tai thi khong co, nen COPY o anh chay se vo. Tao san thu muc rong de COPY luon chay
# duoc, dong thoi van giu duoc phu thuoc long neu sau nay phat sinh.
RUN mkdir -p /app/may_chu/node_modules

# ---------------------------------------------------------------- anh chay
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Chay bang nguoi dung thuong, khong phai root.
RUN mkdir -p /du_lieu/anh_cham_cong && chown -R node:node /du_lieu

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/may_chu/node_modules ./may_chu/node_modules
COPY --from=build --chown=node:node /app/may_chu/dist ./may_chu/dist
COPY --from=build --chown=node:node /app/may_chu/migrations ./may_chu/migrations
COPY --from=build --chown=node:node /app/may_chu/package.json ./may_chu/

USER node
WORKDIR /app/may_chu
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
