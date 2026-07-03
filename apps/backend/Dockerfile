# AnyRamp backend — Bun app that also spawns the isolated Reclaim prover (needs Node 20 +
# native gnark). Everything is baked in, so the server needs nothing pre-installed.
# Build from the repo root: docker build -f apps/backend/Dockerfile .
FROM oven/bun:1-debian

# Node 20 (for the prover) + toolchain to build the prover's native deps (re2, tls, gnark).
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates git python3 make g++ \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Workspace install (bun): root manifests + members, cached before source for faster rebuilds.
COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
# --ignore-scripts: the backend runtime is pure-JS; skip optional native builds (e.g. the
# frontend's utf-8-validate) that would otherwise try node-gyp. The prover's real native
# deps are built separately below via `npm ci`.
RUN bun install --ignore-scripts

# Isolated prover deps (npm + Node 20 → compiles re2 etc. for this platform). The gnark ZK
# binary + circuits are fetched lazily on the first proof (network needed once), then cached.
COPY apps/backend/prover/package.json apps/backend/prover/package-lock.json ./apps/backend/prover/
RUN cd apps/backend/prover && npm ci

# App source.
COPY . .

ENV NODE_ENV=production \
    PORT=4000 \
    PROVE_NODE_BIN=/usr/bin/node
EXPOSE 4000
WORKDIR /app/apps/backend

# Apply DB migrations, then start. (Single-instance friendly; for multi-instance run
# `bun run db:migrate` as a separate release step instead.)
CMD ["sh", "-c", "bun run db:migrate && bun run start"]
