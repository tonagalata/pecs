# PictoTalk app (iOS, iPadOS, Android, web)

Expo SDK 58 + Expo Router. One codebase for the App Store build and the web version.

```bash
npm install
npm run ios        # needs a dev build for native modules: npx expo run:ios, or EAS
npm run web        # browser at http://localhost:8081
npm run typecheck && npm run lint
```

- Routes live in `src/app/` (one file per screen). Shared UI in `src/components/`, logic in `src/lib/`.
- `src/lib/speech.ts` – speech engine (recording → HD clip → device voice). No network needed.
- `src/lib/store.tsx` – everything is saved on the device (AsyncStorage on native, IndexedDB on web).
- `src/lib/vocab.ts` – starting boards for each profile. Words live in fixed `row:col` cells.
- `assets/symbols/` – bundled offline symbols; `src/lib/builtin.ts` is generated from that folder.

iOS release: `npx eas-cli@latest build -p ios --profile production`, then `eas submit -p ios`.
See the root README for the architecture and deployment.
