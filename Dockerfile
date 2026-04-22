FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

RUN npx playwright install --with-deps chromium

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run start"]
