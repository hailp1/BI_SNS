# Stage 1: Build React + Vite production bundle
FROM node:22-alpine AS frontend_builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Stage 2: Nginx Gateway serving React SPA + Legacy fallback + Reverse Proxy
FROM nginx:1.27-alpine

COPY --from=frontend_builder /app/frontend/dist /usr/share/nginx/html/frontend
COPY ./web_app /usr/share/nginx/html/web_app
COPY ./client /usr/share/nginx/html/client
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/nginx-health || exit 1
