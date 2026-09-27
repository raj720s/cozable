# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

> ⚠️ As-built note: ColorSweep **cannot run in Expo Go or the iOS simulator**. It needs the local native module `modules/expo-yolo-tflite` (Kotlin, Android-only) and VisionCamera, so use an Android development build (`npx expo run:android`). See [Running ColorSweep](#running-colorsweep).

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

> ⚠️ As-built note: routes live in **`src/app/`**, not `app/` (for example `src/app/_layout.tsx`, `src/app/camera.tsx`, `src/app/(tabs)/home.tsx`).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

> ⚠️ As-built note: **do not run this.** `package.json:53` points to `scripts/reset-project.js`, which does not exist, so the command fails. Even if the script were restored, it would move the ColorSweep code away.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

# ColorSweep

> The sections below document the **as-built** app (2026-09-27, base commit `f155d8c`), traced to the approved HLD. The Expo template content above is kept unchanged. Full specs are in [`specs/`](specs/), and reviews and tests are in [`docs/`](docs/).

## Overview

ColorSweep is an **Android-first, on-device** app for inspecting day-of-week colour stickers on food-service tray labels. A YOLOv8 model, run through LiteRT in a custom Kotlin Expo module, detects the stickers in the camera feed and classifies each one into one of **7 day-colour classes**. Core detection needs no network (HLD §1.1; [architecture](specs/architecture.md)).

## Capabilities (as-built)

| Capability | Status | Where |
|---|---|---|
| Live detection with boxes on the preview (100 ms throttle, 320×240 frames) | Implemented (deviates from HLD, `DEV-03`/`DEV-04`) | `src/app/camera.tsx:50-56`, `:291-349` |
| SNAP: capture, fresh inference, annotated JPEG | Implemented | `src/app/camera.tsx:487-555` |
| Sweep: record video, track distinct labels, annotated MP4 | Implemented | `src/app/camera.tsx:557-677`; `VideoAnnotator.kt` |
| Session summary: detected vs expected | Implemented (can show dummy rows, `RV-02`) | `src/app/summary.tsx` |
| Gallery of annotated captures (≤ 20, persisted JSON) | Implemented (`DEV-07`) | `src/app/gallery.tsx`; `src/utils/galleryStorage.ts` |
| Home / Inventory / Use-first dashboards | Implemented — Not in HLD — Requires confirmation | `src/app/(tabs)/` |
| Login / Sign-up | **Mock** — Not in HLD | `src/app/login.tsx`, `src/app/signup.tsx` |

## Day-colour classes

The model's output order (`modules/expo-yolo-tflite/android/src/main/java/expo/modules/yolotflite/ExpoYoloTfliteModule.kt:52-61`):

| ID | Colour | Day |
|---|---|---|
| 0 | Black | Sunday |
| 1 | Blue | Monday |
| 2 | Brown | Thursday |
| 3 | Green | Friday |
| 4 | Orange | Saturday |
| 5 | Red | Wednesday |
| 6 | Yellow | Tuesday |

## Architecture at a glance

`expo-router screens → Zustand store (src/store/scanStore.ts) → VisionCamera frame output (worklet) → expo-yolo-tflite (Kotlin, LiteRT, YOLOv8 decode + NMS)`. See [specs/architecture.md](specs/architecture.md) and [specs/contracts.md](specs/contracts.md).

**Stack:** Expo `~57.0.24`, React Native `0.86.3`, VisionCamera `^5.2.3`, Zustand `^5.0.15` (`package.json:10`, `:31`, `:38`, `:42`); Android `minSdkVersion 26` (`android/gradle.properties:64`).

## Prerequisites

- Node.js and npm (version: TBD — Requires confirmation; no `engines` field is set).
- Android SDK with an emulator or device (API 26+). The camera is required.
- **The model file `best_int8_480.tflite`**, placed at `modules/expo-yolo-tflite/android/src/main/assets/`. `*.tflite` is git-ignored (`.gitignore:45-46`) and **is not in the repo**, so get it from the ML owner (TBD — Requires confirmation; see `RV-01`).

## Running ColorSweep

```bash
npm install
npx expo run:android      # builds the dev client with the native module
# later, JS-only changes:
npx expo start --dev-client
```

Kotlin or asset changes need a rebuild (`npx expo run:android`). A Metro reload is not enough.

## Tests

There are **no automated tests or CI** in the repo (`RV-19`). The planned cases (TC-01 … TC-45) and the manual end-to-end checklist are in [docs/test-strategy.md](docs/test-strategy.md). Available checks: `npm run lint` (`package.json:57`).

## Project structure

```
src/app/              expo-router routes (intro, login, (tabs), camera, summary, gallery, …)
src/components/       UI components (BottomNav, CaptureVideoPlayer, …)
src/store/            Zustand scan/session store
src/ml/               ModelProvider (load + warm-up), useTensorDebug
src/utils/            labelTracker, dayColourCalendar, galleryStorage, scanHelpers
src/theme/, src/types/
modules/expo-yolo-tflite/   local Expo module (Kotlin: inference, annotation, video)
```

## Known limitations

- Model asset missing from the repo (`RV-01`), and the HLD, AGENTS.md and code describe different model contracts (`RV-05`).
- The summary may show fabricated rows when nothing was detected (`RV-02`).
- Mock login and sign-up; the static "inventory-updated" screen makes claims (ERP, ISO) that are not implemented (`RV-03`, `RV-04`).
- The annotated video has no audio and is capped at about 45 s (`RV-11`).
- Android only; iOS and web stubs are not functional (`RV-18`).
- The full list is in [docs/review-log.md](docs/review-log.md).

## Documentation index

| Document | Purpose |
|---|---|
| [specs/requirements.md](specs/requirements.md) | BR / FR / US + AC / NFR, gaps and open questions |
| [specs/architecture.md](specs/architecture.md) | As-built architecture, ADRs, deviations from HLD |
| [specs/contracts.md](specs/contracts.md) | Model, native API, data and class-map contracts |
| [docs/test-strategy.md](docs/test-strategy.md) | Test levels, TC catalogue, quality gates |
| [docs/traceability-matrix.md](docs/traceability-matrix.md) | BR → FR → AC → code → TC |
| [docs/review-log.md](docs/review-log.md) | Review findings RV-01 … RV-26 |
| [docs/ai-vs-human-log.md](docs/ai-vs-human-log.md) | Authorship and AI disclosure |
| [docs/business-value.md](docs/business-value.md) | Problem, beneficiaries, impact model, adoption path |
| [AGENTS.md](AGENTS.md) | Guidance for coding agents |
