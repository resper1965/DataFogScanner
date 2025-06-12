# Multi-stage build for production deployment
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY client/ ./client/
COPY shared/ ./shared/

# Build frontend
RUN npm run build

# Python stage for DataFog processing
FROM python:3.11-slim AS python-stage

WORKDIR /app

# Install system dependencies for Python
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY pyproject.toml ./
COPY uv.lock ./

# Install Python dependencies
RUN pip install --no-cache-dir uv
RUN uv sync --frozen

# Production stage
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    python3-dev \
    py3-pip \
    gcc \
    g++ \
    make \
    curl \
    postgresql-client \
    clamav \
    clamav-daemon \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Python environment from python stage
COPY --from=python-stage /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /app/dist ./dist

# Copy server code
COPY server/ ./server/
COPY shared/ ./shared/
COPY drizzle.config.ts ./
COPY tsconfig.json ./

# Copy test files for initial setup
COPY test_*.txt ./

# Create necessary directories
RUN mkdir -p uploads/sftp/incoming uploads/processed logs

# Set up ClamAV
RUN freshclam || true

# Create non-root user
RUN addgroup -g 1001 -S datafog && \
    adduser -S datafog -u 1001 -G datafog

# Change ownership of app directory
RUN chown -R datafog:datafog /app

USER datafog

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start command
CMD ["npm", "start"]