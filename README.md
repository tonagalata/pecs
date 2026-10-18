# PictoTalk

A free picture communication (AAC) board for autistic children, teens and adults.
iPad/iPhone app + web app + landing site. No accounts, no data collection, works offline.

```
apps/mobile   Expo app: iOS, iPadOS, Android and the web version of the board
apps/web      Landing site (Next.js static export)
scripts/voice-pack   Generates the optional HD voice pack with Kokoro, locally, for free
sst.config.ts AWS infrastructure (SST v4): S3 + CloudFront only
```

## How speech works now (and why)

The old version sent every phrase to Resemble, saved the MP3 to R2, and logged it in Turso.
Every new combination of words was a new paid API call and a new file, and the board could
not speak without a connection. With a few hundred words the number of possible messages is
effectively unlimited, so that cache could never "fill up".

Now speech is produced **on the device** (`apps/mobile/src/lib/speech.ts`), in this order:

1. **Family recording** for that word, if a supporter recorded one (stored on the device).
2. **HD voice pack** clip, if switched on: ~150 common words and phrases generated once with
   Kokoro-82M (Apache-2.0). Whole phrase if there's a clip for it, otherwise word by word when
   every word has a clip.
3. **Device voice** for everything else: iOS/Android system voices (the app picks an
   "Enhanced" voice when one is installed) and the Web Speech API in browsers. Any sentence,
   instantly, offline, free.

Cost per family: $0. Nothing about what is said leaves the device.

Next step for voice quality: on-device neural TTS for whole sentences (Kokoro or Piper via
sherpa-onnx as an Expo native module), and iOS Personal Voice (the user's own synthesized
voice, made for AAC apps) through a small native module. Both slot into step 3 of `speak()`.

## Data

- Boards, words, settings: one JSON document on the device (AsyncStorage on iOS/Android,
  IndexedDB on web, with `navigator.storage.persist()` requested).
- Photos: picked from the camera roll or camera, resized to 512 px, copied into the app's
  document folder (native) or kept as data URLs in IndexedDB (web). Never uploaded.
- Recordings: `expo-audio`, saved next to the photos. Never uploaded.
- Symbols: ARASAAC pictograms, cached on the device by `expo-image` after first use, with a
  bundled PictoTalk set (`apps/mobile/assets/symbols`) as the offline fallback. Settings has
  "Download symbols for offline use".
- Words live in fixed `row:col` cells. Shrinking the grid hides cells instead of moving words,
  and "hidden" words keep their place. (The old board shuffled cards on every load, which
  breaks the motor memory people rely on with AAC.)

## Run locally

```bash
npm run install:all
npm run dev:app      # Expo (press w for web, i for iOS simulator)
npm run dev:web      # landing site on http://localhost:3000
```

## Deploy to AWS (SST)

Prerequisites: AWS credentials (`aws configure` or SSO), optional Route 53 hosted zone.

```bash
npm install
PICTOTALK_DOMAIN=pictotalk.org npx sst deploy --stage production   # omit the domain to use *.cloudfront.net
```

This creates:

| Resource | What | Expected cost |
| --- | --- | --- |
| `Web` | Landing site, S3 + CloudFront | cents/month |
| `App` | Web version of the board, S3 + CloudFront | cents/month |
| `Cdn` | `/voice/*` voice pack bucket, `/arasaac/*` cache of ARASAAC images | cents/month |

CloudFront's free tier covers 1 TB of transfer and 10 M requests a month. Route 53 is
$0.50/month per hosted zone. There are no servers, databases or functions to pay for.

**ECS + Postgres:** sketched (commented out) at the bottom of `sst.config.ts`. It would add
roughly $30–60/month before anyone uses it, and with no data collected there is nothing for it
to store yet. Add it when there's a feature that needs a server, such as opt-in backup or sync
between a family's devices.

### Voice pack (optional, one-time)

```bash
brew install ffmpeg
cd scripts/voice-pack && npm install && node generate.mjs
aws s3 sync out/kokoro-v1 s3://<voicePackBucket>/kokoro-v1 --cache-control "public,max-age=31536000,immutable"
```

`<voicePackBucket>` is printed by `sst deploy`. Add words to `phrases.txt` and bump `--version`
to publish a new pack. Families switch it on in Settings → HD voice pack.

## iOS release (EAS)

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios
```

Set `EXPO_PUBLIC_VOICE_PACK_URL` and `EXPO_PUBLIC_ARASAAC_STATIC` (the `cdn` output from SST)
as EAS environment variables so the app uses your CDN. Bundle id: `org.pictotalk.app`
(change in `apps/mobile/app.json` if you already have one registered).

## Removed from v1

Resemble TTS (`/api/tts`), Turso (`cards`, `tts_cache`), Cloudflare R2, the Modal Chatterbox
GPU endpoint, `/api/cards`, `/api/upload-photo` and `/api/arasaac`. Their keys are no longer
needed; you can revoke them.

Symbols: ARASAAC (arasaac.org), Government of Aragón, author Sergio Palao, CC BY-NC-SA.
