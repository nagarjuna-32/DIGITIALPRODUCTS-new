# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

# Copy configurations
COPY next.config.ts postcss.config.mjs tailwind.config.ts* tsconfig.json eslint.config.mjs* ./
COPY src ./src
COPY public ./public

# Disable next telemetry for privacy and build speed
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=http://localhost:5000/api

RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from compiler
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/src ./src

EXPOSE 3000

CMD ["npm", "run", "start"]
