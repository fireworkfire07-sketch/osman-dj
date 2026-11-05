FROM node:22-bookworm-slim

ENV TZ=Europe/Istanbul \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg fonts-dejavu-core fonts-dejavu-extra fonts-noto-color-emoji tzdata ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
# Başsız Chromium (ses motoru) + sistem bağımlılıkları
RUN npx playwright-core install --with-deps chromium && rm -rf /var/lib/apt/lists/*

COPY engine ./engine
COPY src ./src
COPY samples ./samples
COPY config.json ./config.json

VOLUME ["/app/out", "/app/custom"]
CMD ["node", "src/scheduler.js"]
