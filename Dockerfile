# Multi-stage build for Lightning CLI
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm run build

# Runtime image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN npm install -g pnpm

# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S lightning && \
    adduser -S lightning -u 1001

USER lightning

# Mount point for code analysis
VOLUME ["/code"]

# Expose port for API mode (optional)
EXPOSE 3000

# Entry point
ENTRYPOINT ["node", "dist/cli-main.js"]
CMD ["--help"]
