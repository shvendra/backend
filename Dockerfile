# 🚀 Production Dockerfile for BookMyWorkers Backend

FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S node -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Development dependencies for build
FROM base AS deps-dev  
RUN npm ci

# Build stage
FROM deps-dev AS build
COPY . .
# Add any build steps here if needed
# RUN npm run build

# Production image
FROM base AS production
ENV NODE_ENV=production
ENV PORT=8000

# Copy production dependencies
COPY --from=deps --chown=node:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=node:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown -R node:nodejs logs

# Create uploads directory
RUN mkdir -p uploads/{kyc_doc,profile_photo,blog_photos} && \
    chown -R node:nodejs uploads

# Security: Run as non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "start"]