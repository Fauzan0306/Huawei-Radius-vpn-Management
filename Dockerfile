# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install workspace dependencies first to maximize Docker layer caching.
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json

RUN npm ci

COPY . .

# The backend serves the built Vue app from client/dist in production.
RUN npm run build


FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# The backend uses bash for Huawei snapshot commands and radclient for CoA support.
RUN apt-get update \
  && apt-get install -y --no-install-recommends bash freeradius-utils \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN npm install --omit=dev --workspace server

COPY server ./server
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "server"]

