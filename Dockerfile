FROM node:22-slim

# Install build tools for native modules (canvas, better-sqlite3)
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --production=false

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Run the bot
CMD ["node", "dist/index.js"]
