FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ---- API Server ----
FROM node:20-alpine AS api
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY package*.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]

# ---- Worker ----
FROM node:20-alpine AS worker
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY package*.json ./
ENV NODE_ENV=production
CMD ["node", "dist/worker"]
