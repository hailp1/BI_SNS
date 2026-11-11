# Nginx Gateway serving Original Enterprise Web App + Reverse Proxy
FROM nginx:1.27-alpine

COPY ./web_app /usr/share/nginx/html/web_app
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/nginx-health || exit 1
