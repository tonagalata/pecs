# syntax=docker/dockerfile:1
# PictoTalk on Tona Deploy: one container that serves the landing site (/), the web board (/app/)
# and the HD voice pack (/voice/), and uses Postgres through DATABASE_URL when the app has one.
# Base images come from public.ecr.aws (no Docker Hub rate limits) and are multi-arch (arm64 default).
ARG NODE=public.ecr.aws/docker/library/node:24-bookworm-slim

# --- HD voice pack: the one-time Kokoro script, run as part of the build ---------------------
# Downloads Kokoro-82M (~90 MB) from Hugging Face and renders scripts/voice-pack/phrases.txt.
# This stage only reruns when the script, phrases or VOICE/VOICE_PACK_VERSION change.
FROM ${NODE} AS voice
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /voice-pack
COPY scripts/voice-pack/package.json scripts/voice-pack/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY scripts/voice-pack/generate.mjs scripts/voice-pack/phrases.txt ./
ARG VOICE=af_heart
ARG VOICE_PACK_VERSION=kokoro-v1
RUN node generate.mjs --voice "$VOICE" --version "$VOICE_PACK_VERSION"

# --- Web board: Expo web export, served under /app ------------------------------------------
FROM ${NODE} AS board
WORKDIR /src/apps/mobile
COPY apps/mobile/package.json apps/mobile/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY apps/mobile/ ./
ARG VOICE_PACK_VERSION=kokoro-v1
ENV CI=1 \
    EXPO_NO_TELEMETRY=1 \
    EXPO_BASE_URL=/app \
    EXPO_PUBLIC_VOICE_PACK_URL=/voice/${VOICE_PACK_VERSION}
RUN npx expo export --platform web --output-dir dist

# --- Landing site: Next.js static export ------------------------------------------------------
FROM ${NODE} AS site
WORKDIR /src/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY apps/web/ ./
# NEXT_PUBLIC_* values are baked into the HTML at build time; Tona env vars only exist at runtime.
ARG CONTACT_EMAIL=hello@pictotalk.org
ARG APP_STORE_URL=
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_APP_URL=/app \
    NEXT_PUBLIC_CONTACT_EMAIL=${CONTACT_EMAIL} \
    NEXT_PUBLIC_APP_STORE_URL=${APP_STORE_URL}
RUN npm run build

# --- Runtime ----------------------------------------------------------------------------------
FROM public.ecr.aws/docker/library/node:24-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /srv
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server/ ./
COPY --from=site /src/apps/web/out public/site
COPY --from=board /src/apps/mobile/dist public/app
COPY --from=voice /voice-pack/out public/voice
RUN node precompress.mjs public
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
