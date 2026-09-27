# ColorSweep — Requirements (as-built)

> **Status:** As-built specification, reverse-engineered on 2026-09-27 from the code on branch `docs/as-built-documentation` (base commit `f155d8c`) and the approved HLD (`ColorSweep — HLD.pdf`, 55 pages, sections 1–8).
> **Rule of precedence:** the **HLD** is the source of truth for what was *approved*; the **code** is the source of truth for what was *built*. Where they differ, both are shown and a deviation (`DEV-*`, see [architecture.md §18](architecture.md#18-deviations-from-the-hld)) is logged.
> **HLD section 9** ("Limitations, Risks & Future Roadmap") appears in the HLD table of contents (HLD p.2) but **is not present** in the document, which ends at §8.6 (HLD p.55). See `GAP-01`.

Related documents: [architecture.md](architecture.md) · [contracts.md](contracts.md) · [test-strategy](../docs/test-strategy.md) · [traceability matrix](../docs/traceability-matrix.md) · [review log](../docs/review-log.md)

---

## 1. Purpose and scope

**Purpose (HLD §1.1).** ColorSweep is an Android-first, AI-powered colour-detection and tray-inspection app for food-service operations. It identifies and verifies day-of-week colour stickers on food-tray labels, using the device camera and an on-device YOLOv8 model, so that operators rely less on manual visual checks.

### 1.1 In scope (HLD §1.3)

| Area | Scope (HLD) | As-built summary |
|---|---|---|
| Camera-based inspection | Capture camera frames for tray-label detection | Implemented — `src/app/camera.tsx:340-349` |
| Live detection | Frame-based YOLO inference | Implemented, different cadence — `src/app/camera.tsx:50-56`, `:291-338` (`DEV-03`, `DEV-04`) |
| Label detection | Detect predefined day-colour stickers | Implemented — native module `ExpoYoloTfliteModule.kt:439-514` |
| Classification | One of 7 colour/day classes | Implemented — `ExpoYoloTfliteModule.kt:52-61` |
| Bounding boxes | Show detected regions on the preview | Implemented — `src/app/camera.tsx:894-956` (`DEV-10`) |
| SNAP detection | Capture an image and run fresh inference | Implemented — `src/app/camera.tsx:487-555` |
| Image annotation | Save captured image with boxes | Implemented — `ExpoYoloTfliteModule.kt:145-190` |
| Video recording | MP4 with prediction metadata | Implemented, plus additions — `src/app/camera.tsx:557-677` (`DEV-09`) |
| Scan session | Keep detection info during a session | Partial — no explicit session object (`GAP-06`) |
| Prediction log | Keep deduplicated predictions | Partial — in memory only, count shown only — `src/store/scanStore.ts:124-135` |
| Gallery | Show annotated images and metadata | Implemented, persistent across sessions — `src/app/gallery.tsx`, `src/utils/galleryStorage.ts` (`DEV-07`) |
| Summary | Detected vs expected coverage | Implemented, may show dummy data — `src/app/summary.tsx:153-173` (`DEV-12`) |
| On-device inference | Local ML on Android | Implemented — no network calls in app code |
| Android deployment | Package app with native ML module and model | **Partial** — model file not in the repository (`DEV-02`, `RV-01`) |

### 1.2 Out of scope (HLD §1.3)

iOS production support · cloud-based inference · backend-based scan synchronisation · direct ERP integration · **automated tray inventory management** · QR-code processing · on-device model training · federated learning · advanced analytics beyond the current scan/session summary.

> ⚠️ As-built note: the code contains **inventory**, **use-first**, **login/sign-up** and **dashboard** screens, and one screen that claims an ERP sync (`src/app/inventory-updated.tsx:250-253`). These are listed in [§7](#7-features-implemented-but-not-in-the-hld) as scope conflicts that require confirmation.

---

## 2. Stakeholders and users

| Stakeholder | Source | Needs |
|---|---|---|
| **Operator** (food-service / tray inspection) | HLD §1.1, §1.2 obj. 4 | Fast, consistent day-colour verification with immediate visual feedback |
| Supervisor / reviewer | **TBD — Requires confirmation** (not named in the HLD) | Review of gallery and summary results |
| ML engineer | HLD §4.3, §8.3 | Retrain and redeploy the model without breaking the class contract |
| Mobile developer | HLD §8.1–8.2 | Build and run a development build with the native module |

The code UI refers to "operator", "Terminal #04" and "kitchen or warehouse operator" (`src/app/login.tsx:100-104`, `src/app/signup.tsx` "Enroll as kitchen or warehouse operator"); these are UI copy only and not backed by any user model (`Q-09`).

---

## 3. Business requirements

| ID | Business requirement | HLD reference |
|---|---|---|
| BR-01 | The operator can run a **scan session** that keeps detection information for the duration of the scan and ends in a summary. | §1.2 obj. 5; §1.3 "Scan session"; §6.6 |
| BR-02 | The app performs **live detection** on camera frames and shows **bounding boxes** over the preview. | §1.2 obj. 1–2; §1.4.1; §6.2 |
| BR-03 | Each detected label is classified into **one of seven day-colour classes** with a consistent class order across dataset, model and app. | §1.2 obj. 3; §1.4.2; §4.4 |
| BR-04 | The operator can take a **SNAP**: capture a still, run fresh inference and save an **annotated image**. | §1.2 obj. 6; §1.4.3; §6.3 |
| BR-05 | The app keeps a **deduplicated prediction log** of meaningful prediction changes. | §1.3 "Prediction log"; §6.2 "Detection logging" |
| BR-06 | The operator can review captures in a **gallery** with detection metadata. | §1.4.4 |
| BR-07 | At the end of a scan the app shows a **summary** of **detected vs expected coverage**. | §1.4.5; §6.6 |
| BR-08 | The operator can **record video** (MP4) with **prediction metadata**. | §1.2 obj. 6; §5.2 "Video output"; §6.4 |
| BR-09 | Detection runs **on the device**, offline, reliably during continuous scanning. | §1.4.6; §2.2.1; §7.3; §7.6 |
| BR-10 | The model has a managed **lifecycle** (load, status, tensor validation, deployment inside the native module). | §4.5; §5.3; §7.5; §8.3 |

---

## 4. Functional requirements

Status values: **Implemented** · **Partial** · **Not implemented** · **Deviates** (implemented differently from the HLD).

| ID | Functional requirement | Parent | HLD ref | As-built status | Evidence |
|---|---|---|---|---|---|
| FR-01 | Start a scan with an **expected tray count** (1–99). | BR-01, BR-07 | §6.6; §1.4.5 | **Implemented** (Deviates in entry point, `DEV-06`) | Home stepper and START SWEEP `src/app/(tabs)/home.tsx:28-40`, `:118-142`; camera prompt when no count was passed `src/app/camera.tsx:386-394`, `:702-740`; default `9` `src/store/scanStore.ts:110` |
| FR-02 | Share session state (detections, capture, gallery, log) across Camera, Gallery and Summary via Zustand. | BR-01 | §2.3.4; §3.4 | **Implemented** | `src/store/scanStore.ts:58-107`, `:109-321` |
| FR-03 | Request **camera and microphone permissions** before camera-dependent functionality. | BR-01, BR-09 | §7.4 | **Implemented** | Bootstrap prompt `src/app/_layout.tsx:58-82`; camera fallback screens `src/app/camera.tsx:742-760` |
| FR-04 | Run **live inference** on selected frames with a throttle and a **busy guard** (one inference in flight). | BR-02, BR-09 | §5.7; §7.2 | **Deviates** — time-based 100 ms throttle (≤ ~10 Hz) on 320×240 frames instead of every ~6th frame (~5 Hz) on VGA | `src/app/camera.tsx:50-56`, `:291-338`, `:340-349` (`DEV-03`, `DEV-04`) |
| FR-05 | Render **bounding boxes** over the preview, transforming model coordinates to preview coordinates (incl. front-camera mirroring). | BR-02 | §6.5 | **Partial / Deviates** — contain letterbox (not cover); boxes enlarged to ≥ 60×30 px | `src/app/camera.tsx:872-874`, `:894-956` (`DEV-10`, `RV-16`) |
| FR-06 | Classify each detection into one of **7 classes** and show `"<Colour> : <Day>"` with confidence. | BR-03 | §1.4.2; §4.4 | **Implemented** | `ExpoYoloTfliteModule.kt:52-61`, `:584-620`; overlay label `src/app/camera.tsx:950` |
| FR-07 | Keep the **class order** identical in dataset, `data.yaml`, model, native layer and app. | BR-03 | §4.4 | **Partial** — consistent across all in-repo definitions; dataset/`data.yaml` not in repo, so not verifiable | See [contracts.md §1](contracts.md#1-class-map-contract) |
| FR-08 | **SNAP**: capture a photo, run fresh inference on it, annotate if boxes exist, save to gallery, open summary. | BR-04, BR-06 | §6.3 | **Implemented** (falls back to live boxes if SNAP inference fails) | `src/app/camera.tsx:487-555`; annotate `ExpoYoloTfliteModule.kt:145-190` |
| FR-09 | Keep a **prediction log**: add an entry only when the top class changes or confidence changes by ≥ 0.10. | BR-05 | §6.2 | **Partial** — in memory, capped at 80, not persisted, only a count is shown | Rule `src/app/camera.tsx:251-260`; store `src/store/scanStore.ts:25`, `:124-135`; UI count only `src/app/gallery.tsx:241` |
| FR-10 | **De-duplicate** the same physical label across frames during a sweep so it counts once. | BR-05, BR-07 | §6.2; §3.5 | **Implemented** (in `utils/labelTracker.ts`, not in the HLD's `useCentroidTracking`) | `src/utils/labelTracker.ts:40-41`, `:73-141`; `src/hooks/useCentroidTracking.ts` is empty (`DEV-08`) |
| FR-11 | **Gallery**: list captures with media, detection metadata and size; open → summary; delete; clear all. | BR-06 | §1.4.4 | **Deviates** — persists across sessions (up to 20 items) in a JSON file | `src/app/gallery.tsx:92-230`; `src/utils/galleryStorage.ts:6-7`, `:46-73`, `:107-120`; cap `src/types/index.ts:62` (`DEV-07`) |
| FR-12 | **Summary**: show detected vs expected, coverage %, verified vs flagged, per-label rows. | BR-07 | §1.4.5 | **Deviates** — may show fabricated "dummy" rows when no real detections exist | `src/app/summary.tsx:153-180`, `:270-324`; dummy fallback `src/store/scanStore.ts:153-156`, `src/utils/scanHelpers.ts:10-29` (`DEV-12`, `RV-02`) |
| FR-13 | **Video**: record MP4; while recording, sample detections every 500 ms into frame reports; store with the capture. | BR-08 | §5.2; §6.4 | **Implemented** (plus burned-in overlay video, `DEV-09`) | `src/app/camera.tsx:53`, `:269-280`, `:557-677`; `src/types/index.ts:75-81` |
| FR-14 | Run inference **on the device** with no network dependency. | BR-09 | §7.3 | **Implemented** | No `fetch`/`axios`/WebSocket in `src/` or the module sources; LiteRT dependency `modules/expo-yolo-tflite/android/build.gradle:20-25` |
| FR-15 | A frame without detections, or an inference error, must **not** end the scan. | BR-09 | §7.6 | **Implemented** | `src/app/camera.tsx:281-285` (catch + release busy flag) |
| FR-16 | **Load the model** once, report status (`loading`/`loaded`/`error`), warm up, and gate live inference on `isLoaded`. | BR-10 | §5.3; §7.5 | **Implemented** | `src/ml/ModelProvider.tsx:84-153`; gate `src/app/camera.tsx:226-229` |
| FR-17 | **Validate tensors** (`[1,3,640,640]` → `[1,11,8400]`, 7 classes) before scanning. | BR-10 | §7.6; §8.3; §8.4.1 | **Partial** — shapes are logged, never asserted; as-built model is 480-input | `src/ml/useTensorDebug.ts:9-37`; `src/ml/ModelProvider.tsx:49-78` (`DEV-01`) |
| FR-18 | **Package the model** in the native module's assets. | BR-10 | §4.5; §8.3 | **Not implemented in repo** — `*.tflite` is git-ignored and `best_int8_480.tflite` is absent | `.gitignore:45-46`; `ExpoYoloTfliteModule.kt:42`; no `modules/expo-yolo-tflite/android/src/main/assets/` (`DEV-02`, `RV-01`) |
| FR-19 | Surface camera and ML **errors** to the user as understandable states. | BR-09 | §7.5 | **Partial** — camera errors handled; model failure only shows a status label | Camera `src/app/camera.tsx:448-456`, `:762-798`; model label `:800-805`; see [architecture.md §12](architecture.md#12-error-handling) |

---

## 5. User stories and acceptance criteria

One story per HLD §8.5 "E2E acceptance area" (HLD p.54). Values are the as-built constants unless stated.

### US-01 — Application startup
*As an operator, I want the app to launch reliably so that I can start inspecting.*
- **US-01-AC1** — Given a fresh launch, when fonts load, permissions have been prompted and the gallery index has been read, then the native splash hides without waiting for the model (`src/app/_layout.tsx:109-117`).
- **US-01-AC2** — Given the splash has hidden, when the intro animation has run for 1 900 ms, then the app replaces the route with `/login` (`src/app/index.tsx:14`, `:57-59`).
- **US-01-AC3** — Given the model load takes longer than startup, when the operator reaches Home, then the UI is usable and the model continues loading in the background (`src/ml/ModelProvider.tsx:94-147`).

### US-02 — Permissions
- **US-02-AC1** — Given camera permission is not granted and can be requested, when the app first starts, then it requests camera and then microphone permission once (`src/app/_layout.tsx:58-82`).
- **US-02-AC2** — Given camera permission is denied, when the operator opens the camera, then a "Camera access required" screen shows the status and an Allow/Open Settings button (`src/app/camera.tsx:742-760`).
- **US-02-AC3** — Given microphone permission is denied, when the operator taps START SWEEP, then an alert offers Open Settings and recording does not start (`src/app/camera.tsx:562-573`, `:407-418`).

### US-03 — Camera
- **US-03-AC1** — Given permission is granted and a back camera exists, when the camera screen opens with a confirmed count, then the preview starts and the status shows "Starting camera…" until `onStarted` fires (`src/app/camera.tsx:872-892`, `:983-985`).
- **US-03-AC2** — Given no device for the selected position, then "No camera device" with "Try other lens" is shown (`src/app/camera.tsx:762-774`).
- **US-03-AC3** — Given a non-benign camera error, then "Camera unavailable" with Retry / Open Settings / Go back is shown (`src/app/camera.tsx:448-456`, `:776-798`).

### US-04 — Live detection
- **US-04-AC1** — Given the model is loaded and the camera is running, when ≥ 100 ms have passed since the last inference and no inference is in flight, then one RGB frame is sent to `detectRgb` (`src/app/camera.tsx:302-335`).
- **US-04-AC2** — Given an inference is in flight, when a new frame arrives, then it is not sent (busy guard) (`src/app/camera.tsx:305-306`).
- **US-04-AC3** — Given the model is not loaded, when a frame packet reaches JS, then it is dropped and the busy flag cleared (`src/app/camera.tsx:226-229`).
- **US-04-AC4** — Given the top detection keeps the same class, when its confidence changes by 0.05, then no prediction-log entry is added; when it changes by 0.12, then one entry is added (`src/app/camera.tsx:251-260`).

### US-05 — Bounding boxes
- **US-05-AC1** — Given detections are returned, then each is drawn as a box with the label and confidence %, green if confidence ≥ 0.85 and amber otherwise (`src/app/camera.tsx:916-917`, `:950`; `src/types/index.ts:32`).
- **US-05-AC2** — Given the front camera is active, then box x positions are mirrored (`src/app/camera.tsx:910-912`).
- **US-05-AC3** — Given a detection smaller than 60×30 px on screen, then the drawn box is enlarged to 60×30 px (`src/app/camera.tsx:914-915`). *(As-built behaviour; approval `Q-12`.)*

### US-06 — Classification
- **US-06-AC1** — Given the model outputs class id `c` in 0–6, then the label is `LABELS[c]` in the order Black:Sunday, Blue:Monday, Brown:Thursday, Green:Friday, Orange:Saturday, Red:Wednesday, Yellow:Tuesday (`ExpoYoloTfliteModule.kt:52-61`, `:619`).
- **US-06-AC2** — Given two overlapping boxes of different classes with IoU > 0.30, then only the higher-confidence one is kept (class-agnostic NMS) (`ExpoYoloTfliteModule.kt:635-658`).

### US-07 — SNAP
- **US-07-AC1** — Given the camera is ready, when the operator taps the camera button, then a photo is captured at HD 4:3, saved to a temp file, and `detectImageUri` runs on that file (`src/app/camera.tsx:198-201`, `:498-513`).
- **US-07-AC2** — Given SNAP inference throws, then the live detections at that moment are used instead (`src/app/camera.tsx:510-513`).
- **US-07-AC3** — Given SNAP is pressed while recording, then the button is disabled (`src/app/camera.tsx:1003`).

### US-08 — Annotation
- **US-08-AC1** — Given SNAP returned ≥ 1 detection, then an annotated JPEG (quality 92) with green boxes and labels is written to the app cache and becomes the saved image (`ExpoYoloTfliteModule.kt:145-190`; `src/app/camera.tsx:518-526`).
- **US-08-AC2** — Given annotation fails, then the raw photo is saved (`src/app/camera.tsx:523-525`).

### US-09 — Gallery
- **US-09-AC1** — Given a capture completes, then its media is copied into `documents/gallery/<id>.<ext>` and the index file `documents/gallery/index.json` is rewritten with the new item first (`src/utils/galleryStorage.ts:76-105`, `:67-73`; `src/store/scanStore.ts:179-192`).
- **US-09-AC2** — Given 21 items, when a new capture is saved, then only the newest 20 are kept and the oldest media file is deleted (`src/utils/galleryStorage.ts:107-120`; `src/types/index.ts:62`).
- **US-09-AC3** — Given the operator long-presses an item and confirms, then its media file and index entry are deleted (`src/app/gallery.tsx:131-146`; `src/store/scanStore.ts:269-290`).

### US-10 — Session
- **US-10-AC1** — Given the camera screen mounts, then `startScan()` clears detections, YOLO boxes, capture and active gallery id (`src/app/camera.tsx:363-384`; `src/store/scanStore.ts:311-318`).
- **US-10-AC2** — Given a sweep is recording, when the same physical label stays in view across frames (IoU ≥ 0.28 same class, ≥ 0.55 cross-class), then it is counted once (`src/utils/labelTracker.ts:40-41`, `:91-140`).
- **US-10-AC3** — Given a new recording starts, then the distinct-label tracker and frame reports reset (`src/app/camera.tsx:591-598`).

### US-11 — Summary
- **US-11-AC1** — Given 7 distinct labels and expected 9, then the summary shows "7 / 9" and "78% COVERAGE" (`src/app/summary.tsx:163-164`, `:282-286`).
- **US-11-AC2** — Given any row confidence < 0.85, then it is shown as Flagged and the "RE-SCAN FLAGGED (n)" button appears (not from gallery) (`src/app/summary.tsx:166-173`, `:436-443`).
- **US-11-AC3** — Given no real detections were recorded, then the summary must show no rows. **As-built: fails** — `buildDummyDetections` supplies fake rows (`src/store/scanStore.ts:153-156`). See `RV-02`.

### US-12 — Model
- **US-12-AC1** — Given the app starts on Android, then after ~100 ms the model loads, a warm-up inference runs on a 480×480 zero image, and state becomes `loaded` (`src/ml/ModelProvider.tsx:95-147`, `:47`).
- **US-12-AC2** — Given the model asset is missing or invalid, then state becomes `error` and the camera shows "Model failed" (`src/ml/ModelProvider.tsx:140-145`; `src/app/camera.tsx:800-805`).
- **US-12-AC3** — Given the model is loaded, then the tensor report shows input `[1,3,480,480]` and output `[1,11,4725]` *(as-built expectation; HLD expects `[1,3,640,640]` / `[1,11,8400]`, `DEV-01`)*.

### US-13 — Stability
- **US-13-AC1** — Given 100 consecutive frames without detections, then scanning continues and the overlay is empty (`src/app/camera.tsx:250`, `:281-285`).
- **US-13-AC2** — Given the app goes to the background, then the camera deactivates and torch turns off; on return it reactivates (`src/app/camera.tsx:396-405`, `:356-361`).
- **US-13-AC3** — Given the device is in airplane mode, when the operator runs live detection and SNAP, then both work (no network dependency; no network calls in `src/` or the module sources).

### US-14 — Performance
- **US-14-AC1** — Given live scanning, then no more than one inference is in flight and the interval between inference starts is ≥ 100 ms (`src/app/camera.tsx:51`, `:302-335`).
- **US-14-AC2** — Given a mid-range reference device, then native inference ≤ 120 ms and end-to-end ≤ 150 ms (HLD §5.7). **As-built value: TBD — not measured** (only the first `detectRgb` timing is logged, `ExpoYoloTfliteModule.kt:129-134`).

### US-15 — Video recording with prediction metadata
*Not an HLD §8.5 row; added so that BR-08 / FR-13 are covered.*
- **US-15-AC1** — Given the model is loaded, when the operator records a 10-second sweep, then about 20 `VideoFrameReport`s (one per 500 ms of inference) are stored with the gallery item and listed in the summary's frame-wise report (`src/app/camera.tsx:53`, `:269-280`; `src/app/summary.tsx:379-407`).
- **US-15-AC2** — Given a sweep longer than 45 seconds, when recording stops, then the burned-in annotated MP4 covers at most the first ~45 seconds and has no audio (as-built limitation, `VideoAnnotator.kt:28`, `:93-99`, `:115`; see `RV-11`).

---

## 6. Non-functional requirements

| ID | Requirement (HLD) | HLD ref | As-built value | Evidence |
|---|---|---|---|---|
| NFR-01 | Camera preview ≈ 30 FPS | §5.7; §7.1 | Device default; not configured; **TBD — not measured** | No FPS constraint on `Camera` `src/app/camera.tsx:872-892` |
| NFR-02 | Inference ≈ 5 Hz (every ~6th frame) | §1.4.1; §5.7; §7.2 | **≤ ~10 Hz** (100 ms time throttle) | `src/app/camera.tsx:50-51`, `:302-303` (`DEV-03`) |
| NFR-03 | Native CPU inference ≈ 120 ms | §5.7; §7.1 | **TBD — not measured**; first-call timing logged | `ExpoYoloTfliteModule.kt:123-134` |
| NFR-04 | End-to-end inference ≈ 150 ms | §5.7; §7.1 | **TBD — not measured** | — |
| NFR-05 | One inference in flight (no backlog) | §7.2 | **Met** — worklet-safe `mlBusy` flag + `dropFramesWhileBusy` | `src/app/camera.tsx:206-207`, `:304-335`, `:347` |
| NFR-06 | Offline core detection | §7.3 | **Met** — no network calls | [§4 FR-14](#4-functional-requirements) |
| NFR-07 | Permissions CAMERA, RECORD_AUDIO | §7.4 | **Met** | `app.json:25-28` |
| NFR-08 | minSdk 26, targetSdk 34+ | §7.4 | minSdk **26** met; targetSdk **TBD** (set by Expo SDK 57 defaults; `android/` is generated and git-ignored) | `app.json:37-44`; `.gitignore:41-43` |
| NFR-09 | Continue scanning after frames without detection | §7.6 | **Met** | `src/app/camera.tsx:281-285` |
| NFR-10 | Model input 640×640 Float32 NCHW; output `[1,11,8400]` | §2.3.6; §4.2 | **480×480** input, 4 725 anchors; INT8 file name | `ExpoYoloTfliteModule.kt:42-46` (`DEV-01`) |
| NFR-11 | Android-first; iOS out of scope | §1.3 | **Met** — iOS module throws "Android-only" | `modules/expo-yolo-tflite/ios/ExpoYoloTfliteModule.swift:15-37` |
| NFR-12 | Development build required (not Expo Go) | §8.1 | **Met** — local native module | `package.json:28` |

---

## 7. Features implemented but not in the HLD

Every row: **Implemented — Not in HLD — Requires confirmation.**

| Feature | Files | Real or mock | Notes |
|---|---|---|---|
| Animated intro screen at `/` | `src/app/index.tsx` | Real (UI only) | Replaces HLD "Home / Start" at `index.tsx` (`DEV-06`) |
| Login | `src/app/login.tsx` | **Mock** | `handleLogin` only navigates (`:23-25`); pre-filled demo credentials (`:18-19`); Touch ID / Face ID / Forgot / Register Scanner / Sensor Calibration / Support do nothing (`:69-71`, `:114-121`, `:134-138`); on-screen text "any valid email and 6+ character password works" is not enforced (`:130-131`) |
| Sign-up | `src/app/signup.tsx` | **Mock** | Pre-filled fields; "Matches ✓" is static; `handleSignup` only navigates (`:27-30`); nothing is stored |
| Tab shell + dashboard (Home) | `src/app/(tabs)/_layout.tsx`, `(tabs)/home.tsx`, `components/BottomNav.tsx` | Real (derived from gallery data) | Week strip, "this week" counts, "use now", latest scan (`home.tsx:18-26`) |
| Inventory list | `src/app/(tabs)/inventory.tsx` | Derived (gallery YOLO boxes of this week); row action buttons are **no-ops** | "Units" = number of detections across captures, not stock (`dayColourCalendar.ts:337-357`) |
| Use First | `src/app/(tabs)/use-first.tsx` | Derived | Lists colours due today/tomorrow/overdue |
| More / Rotation | `src/app/(tabs)/more.tsx` | Derived | Class → weekday table with weekly counts; **no settings** that change detection |
| Inventory Updated | `src/app/inventory-updated.tsx` | **Mock, orphan** | No route navigates here; static "SYNCED", "ledger synced with ERP", "ISO-22000 HACCP Verified", "0.18s LATENCY", `BCH-8824` (`:156`, `:227-228`, `:250-257`) |
| Expiry / "use-by" rules | `src/utils/dayColourCalendar.ts:207-249`, `:314-443`; `src/hooks/useDayColourOps.ts` | Real logic, unconfirmed business rule | A colour's weekday in the current Sun–Sat week is its due date; earlier weekday = expired (`Q-07`) |
| Re-scan flagged labels | `src/app/summary.tsx:182-201`; `src/app/camera.tsx:125-126`, `:363-374` | Real | Opens a new capture with expected = number flagged; does not merge back |
| Burned-in annotated video | `modules/.../VideoAnnotator.kt`; `src/app/camera.tsx:628-643` | Real | 10 fps re-encode, no audio, max 450 frames (≈ 45 s) (`VideoAnnotator.kt:28`, `:97`, `:115`) |
| Video re-processing ("Live detect", "Re-scan video") | `src/components/CaptureVideoPlayer.tsx:60-169` | Real | Contradicts HLD §6.4 "not re-processed" unless explicitly added (`DEV-09`) |
| Gallery "Detect photos" | `src/app/gallery.tsx:148-211` | Real | Re-runs YOLO on saved photos (which are already annotated) (`RV-10`) |
| GPU delegate path | `ExpoYoloTfliteModule.kt:247-306` | Real, dormant | Used only when the asset name lacks "int8" |

---

## 8. Assumptions, constraints, dependencies

**Constraints**
- Android only; development build required (HLD §8.1; `package.json:28`).
- Expo SDK 57, React Native 0.86.3, VisionCamera 5.2.3, Worklets 0.10.1, Zustand 5.0.15 (installed versions; see [architecture.md §3](architecture.md#3-technology-stack)).
- LiteRT 1.4.1 on Android (`modules/expo-yolo-tflite/android/build.gradle:21-24`).
- Model weights are **kept out of git** by policy (`.gitignore:45-46`; merge commit `d734a21` message).

**Assumptions** (to confirm)
- The deployed model is a YOLOv8n export at 480×480 input with 4 725 anchors and 7 classes, matching `ExpoYoloTfliteModule.kt:42-46`.
- One gallery item = one scan (SNAP or sweep).

**Dependencies**
- Trained model file `best_int8_480.tflite` placed in `modules/expo-yolo-tflite/android/src/main/assets/` before build.
- Training pipeline outside the repo (Label Studio → Ultralytics → TFLite, HLD §4.3); no `data.yaml`, notebooks or dataset are in the repo.

---

## 9. Open questions and gaps

| ID | Question / gap | Why it matters | Evidence |
|---|---|---|---|
| GAP-01 | HLD §9 (limitations, risks, roadmap) is listed in the TOC but missing. | Risks and roadmap in [architecture.md §19–20](architecture.md#19-risks) are derived, not approved. | HLD p.2 vs p.55 |
| Q-01 | What exactly is **"expected coverage"**? As-built: `min(100, round(detected / expected × 100))`, where "detected" is distinct sweep labels, else SNAP boxes, else stored detections. | Defines summary correctness. | `src/app/summary.tsx:155-164` |
| Q-02 | Which **confidence threshold** is approved? As-built uses 0.30 (native filter), 0.85 (verified/green, defined 3 times), 0.45 (gallery "locked"), 0.5 (store "locked"). | Drives what the operator sees as verified. | `ExpoYoloTfliteModule.kt:47`; `src/types/index.ts:32`; `src/theme/scanner.ts:89`; `src/utils/dayColourCalendar.ts:308`; `src/app/gallery.tsx:24`; `src/store/scanStore.ts:163` |
| Q-03 | Is the **prediction-log dedup rule** approved? As-built: log when the top class changes or `|Δconfidence| ≥ 0.10`; cap 80; not persisted. | HLD says "changes significantly" only. | `src/app/camera.tsx:251-260`; `src/store/scanStore.ts:25` |
| Q-04 | Is the **label de-dup rule** approved? As-built: greedy IoU match, 0.28 same class / 0.55 cross-class, no time window, tracks never expire, reset only when a recording starts. | Affects "distinct" count. | `src/utils/labelTracker.ts:40-41`, `:73-141`; `src/app/camera.tsx:596` |
| Q-05 | **Gallery persistence and retention**: HLD says "within the current scan session"; code keeps up to 20 items across restarts in `documents/gallery/`. Approved retention? | Privacy and storage. | `src/utils/galleryStorage.ts:6-7`; `src/types/index.ts:62` |
| Q-06 | **Video metadata format**: as-built `VideoFrameReport { atMs, frameIndex, detections[] }` every 500 ms, stored in the gallery index. Approved? | HLD does not define it. | `src/types/index.ts:75-81`; `src/app/camera.tsx:53`, `:269-280` |
| Q-07 | **Expiry rules**: a colour's weekday within the current Sun–Sat week = due date; earlier = expired. Approved? | Business rule not in HLD. | `src/utils/dayColourCalendar.ts:117-130`, `:223-249` |
| Q-08 | **"Sweep"** is not an HLD term. As-built: sweep = video recording (START/STOP SWEEP) while the tracker counts distinct labels. Confirm terminology. | Terminology alignment. | `src/app/camera.tsx:966-973`, `:1008-1020` |
| Q-09 | **Scope** of login/sign-up, inventory, use-first, dashboard and inventory-updated (HLD §1.3 lists automated tray inventory as out of scope). | Scope conflict. | [§7](#7-features-implemented-but-not-in-the-hld) |
| Q-10 | **Multi-sticker / multi-tray counting**: native caps at 20 detections per image; HLD lists multi-tray as roadmap. What is the approved maximum? | Coverage on large racks. | `ExpoYoloTfliteModule.kt:49`, `:624-627` |
| Q-11 | **Model contract**: HLD 640 / `[1,11,8400]` vs code 480 / 4 725 anchors, INT8 file. Which is approved, and where is the model file stored? | Build reproducibility. | `ExpoYoloTfliteModule.kt:42-46`; `.gitignore:45-46` |
| Q-12 | Is the **minimum drawn box size** (60×30 px) and **contain** preview scaling approved (HLD §6.5 assumes cover)? | Box alignment. | `src/app/camera.tsx:873`, `:914-915` |
| GAP-02 | No automated tests and no CI. | Quality gates (HLD §8.6) cannot be evidenced. | No `__tests__`, `*.test.*`, `.github/` |
| GAP-03 | Summary can show fabricated rows. | Trust in results. | `src/store/scanStore.ts:153-156` |
| GAP-04 | Model file not in repository. | Clean builds cannot run inference. | `.gitignore:45-46` |
| GAP-05 | Performance metrics not measured on device. | NFR-01/03/04 unverifiable. | — |
| GAP-06 | No explicit scan-session entity (id, start/end times); summary "session id" is derived from the expected count. | Traceability of scans. | `src/app/summary.tsx:213-215` |
| GAP-07 | Model-load failure has no user-facing recovery (only a status label). | HLD §7.5 asks for understandable states. | `src/app/camera.tsx:800-805` |
