FROM node:20-alpine AS builder
RUN apk add --no-cache openssl

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 && chown nestjs:nodejs /app

USER nestjs
COPY --chown=nestjs:nodejs package*.json ./
COPY --chown=nestjs:nodejs prisma ./prisma/
RUN npm install --only=production && npx prisma generate

COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
