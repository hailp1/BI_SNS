FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --only=production && npx prisma generate

COPY --from=builder /app/dist ./dist
RUN chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
