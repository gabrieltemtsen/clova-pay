
# Base image
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source
COPY . .

# Build
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Environment
ENV NODE_ENV=production

# Start
CMD ["npm", "run", "start:prod"]
