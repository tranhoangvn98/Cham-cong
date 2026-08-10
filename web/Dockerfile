# Build tu thu muc GOC cua repo:  docker build -f web/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY may_chu/package.json ./may_chu/
COPY web/package.json ./web/
RUN npm ci --workspace web --include-workspace-root

COPY web ./web
# URL API duoc nhung vao ma JS luc BUILD (Vite thay the luc bien dich, khong doc runtime).
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
# Tien to duong dan khi webapp khong nam o goc ten mien (vd /chamcong/).
ARG VITE_BASE=/
ENV VITE_BASE=$VITE_BASE
RUN npm run --workspace web build

# ---------------------------------------------------------------- anh chay
FROM nginx:1.27-alpine
COPY --from=build /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
