# Self-hosted Reclaim attestor. Built from a pinned attestor-core commit so it's fully
# reproducible without vendoring the (large) upstream source into this repo.
#
# The witness signing key is provided at RUNTIME via the PRIVATE_KEY env var (never baked
# into the image). Its address must be registered on the Reclaim verifier via add_epoch —
# for AnyRamp that is 0x93f58be9dde2635e64538ec1d1be9a16cb03618c.
FROM node:24-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Pin to the exact attestor-core commit AnyRamp's on-chain witness was validated against.
ARG ATTESTOR_REF=51afb434f192789dd3c557b28aed5d403ffc3a07

WORKDIR /app
RUN git init -q \
  && git remote add origin https://github.com/reclaimprotocol/attestor-core \
  && git fetch -q --depth 1 origin "${ATTESTOR_REF}" \
  && git checkout -q FETCH_HEAD

RUN npm i \
  && npm run build \
  && npm run download:zk-files \
  && npm run build:browser \
  && npm prune --production

ENV PORT=8001 \
    DISABLE_BGP_CHECKS=1 \
    HTTP_MAX_REDACTIONS_IN_PATH=64 \
    NODE_ENV=production
EXPOSE 8001
CMD ["npm", "run", "start"]
