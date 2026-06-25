# Base node image
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies first for caching
COPY package*.json ./
RUN npm ci

# Copy configuration files and Prisma settings
COPY tsconfig.json ./
COPY prisma ./prisma/

# Generate prisma client types
RUN npx prisma generate

# Copy source code and build TS
COPY src ./src
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

# Copy generated Prisma models and compiled assets
COPY prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/dist ./dist

# Environmental settings
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Script to run migrations and start backend server
CMD ["node", "dist/index.js"]
