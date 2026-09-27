# ColorSweep — Contracts (as-built)

> **Status:** As-built interface contracts, 2026-09-27, base commit `f155d8c`. HLD = approved; code = as-built.
> `Kt` = `modules/expo-yolo-tflite/android/src/main/java/expo/modules/yolotflite/ExpoYoloTfliteModule.kt`; `VA` = `.../VideoAnnotator.kt`.

Related: [requirements.md](requirements.md) · [architecture.md](architecture.md)

---

## 1. Class-map contract

**Approved (HLD §1.4.2, §4.4):**

| Class id | Colour | Day | Label |
|---|---|---|---|
| 0 | Black | Sunday | `Black : Sunday` |
| 1 | Blue | Monday | `Blue : Monday` |
| 2 | Brown | Thursday | `Brown : Thursday` |
| 3 | Green | Friday | `Green : Friday` |
| 4 | Orange | Saturday | `Orange : Saturday` |
| 5 | Red | Wednesday | `Red : Wednesday` |
| 6 | Yellow | Tuesday | `Yellow : Tuesday` |

**Every definition in the code:**

| # | Location | What it defines | Order | Result |
|---|---|---|---|---|
| 1 | `Kt:52-61` `LABELS` | id → label string (source of truth per comment "MUST match data.yaml") | 0 Black … 6 Yellow | **Consistent** |
| 2 | `src/utils/labelTracker.ts:4-12` `CLASS_ID_TO_DAY_COLOUR` | id → colour | same | **Consistent** |
| 3 | `src/utils/dayColourCalendar.ts:36-100` `DAY_COLOUR_CLASSES` | id → colour, weekday, weekdayIndex, hex, label | same | **Consistent** |
| 4 | `src/theme/scanner.ts:53-61` `CLASS_COLORS_BY_ID` | id → hex | same | **Consistent** |
| 5 | `src/theme/scanner.ts:39-47` `dayHex` | weekday → hex | keyed by day | **Consistent** with #3 |
| 6 | `src/types/index.ts:11-19` `DAY_COLOURS` | colour list (Mon-first display order: Blue, Yellow, Red, Brown, Green, Orange, Black) | **not** class order | **Consistent** (not used as an id map; used by `buildDummyDetections`, `src/utils/scanHelpers.ts:16`) |
| 7 | `src/types/index.ts:21-29` `DAY_COLOUR_HEX` | colour → hex | keyed | Consistent; **unused** |
| 8 | `src/theme/scanner.ts:63-71` `ROTATION_DAYS` | Mon-first display rows; Sunday = "Black / Dark Slate" | display | Consistent; **unused** |
| 9 | `src/ml/colorName.ts:2-29` `rgbToColorName` | generic hue names (red, orange, yellow, green, cyan, blue, purple, pink, black, white, gray) | n/a | **Not a class map**; unused |
| 10 | Training `data.yaml` / exported model metadata | — | — | **Not in repository — cannot verify** |

**Single source of truth:** none. Five places hard-code the order (#1–#5). The TS layer can also fall back to parsing the colour from the label text (`src/utils/labelTracker.ts:60-67`), defaulting to `Black` for unknown values — a silent mis-map risk (`RV-09`).

---

## 2. Model contract

| Attribute | HLD (approved) | As-built (code) | Evidence |
|---|---|---|---|
| File name | TBD in HLD; AGENTS.md: `yolov8n_int8.tflite` (float32 export) | `best_int8_480.tflite` | `Kt:42`; `AGENTS.md:21-22` |
| Asset path | Native module model-assets location (HLD §8.3) | `modules/expo-yolo-tflite/android/src/main/assets/<MODEL_ASSET>` via `FileUtil.loadMappedFile` | `Kt:245`; directory absent |
| Input | `[1, 3, 640, 640]` Float32 NCHW | `[1, 3, 480, 480]` Float32 NCHW buffer (`4 × 3 × 480²` bytes) | `Kt:43`, `:526-528` |
| Normalisation | 0–1, letterbox | RGB / 255, pad 114/255, centred letterbox, bilinear scale | `Kt:50`, `:519-551` |
| Output | `[1, 11, 8400]` (4 box + 7 scores) | Read from interpreter shape; handles `[1,C,A]` and transposed `[1,A,C]`; fallback constants `NUM_ATTRS = 12`, `NUM_ANCHORS = 4 725` | `Kt:442-469`, `:45-46` |
| Box format | cx, cy, w, h | cx, cy, w, h in letterbox pixels, or 0..1 (auto-detected when max \|value\| ≤ 2.5 over first 64 anchors) | `Kt:575-606` |
| Scores | per-class | sigmoid applied if any of first 32 class-0 scores is < 0 or > 1.05 | `Kt:566-573` |
| Confidence threshold | TBD (HLD) | **0.30** | `Kt:47`, `:595` |
| NMS | Native | Class-agnostic, IoU > **0.30** suppressed, then top **20** by confidence | `Kt:48-49`, `:623-658` |
| Min box | — | discard if normalised w or h ≤ 0.002 | `Kt:617` |
| Delegate | CPU | CPU + XNNPACK, 4 threads when file name contains "int8"; otherwise GPU if supported, CPU fallback | `Kt:247-306` |
| Class count reported | 7 | `numClasses: 7` (constant, not read from the model) | `Kt:44`, `:342` |

> ⚠️ As-built note: `NUM_ATTRS = 4 + NUM_CLASSES + 1 // 12 (box + objectness + classes)` (`Kt:45`). YOLOv8 has **no** objectness channel (output channels = 4 + 7 = 11, HLD §4.2). The constant is only used as a fallback and in the transposition check `outAnchors == NUM_ATTRS` (`Kt:447`); a transposed `[1, 8400, 11]` model would not be detected as transposed (`RV-06`).

---

## 3. Native module API (TS ↔ Kotlin)

TS declaration: `modules/expo-yolo-tflite/src/ExpoYoloTfliteModule.ts:4-35` (module name `ExpoYoloTflite`, `Kt:83`). Types: `modules/expo-yolo-tflite/src/ExpoYoloTflite.types.ts`.

| Function | TS signature | Kotlin | Returns / errors | Thread |
|---|---|---|---|---|
| `isSupported` | `isSupported(): boolean` | `Function` → `true` (`Kt:85-87`) | `true` on Android; `false` on iOS/web | Sync, JS thread |
| `isLoaded` | `isLoaded(): boolean` | `interpreter != null` (`Kt:90-92`) | never loads | Sync |
| `loadModel` | `loadModel(): Promise<ModelTensorReport>` | `AsyncFunction`; `ensureInterpreterOnBackground()` spawns thread `YoloTflite-load` and blocks on a latch (`Kt:96-99`, `:220-238`) | tensor report; rejects if asset missing/invalid | Expo async queue + worker thread |
| `getTensorInfo` | `getTensorInfo(): ModelTensorReport` | `Function`; throws "Model not loaded. Call loadModel() first." (`Kt:102-107`) | report | Sync |
| `detectRgb` | `detectRgb(pixels: Uint8Array, width, height, stride, channels, isBgra): Promise<YoloDetection[]>` | `AsyncFunction(pixels: ByteArray, …)` (`Kt:120-139`) | detections; rejects if not loaded | Expo async queue |
| `detectImageUri` | `detectImageUri(uri: string): Promise<YoloDetection[]>` | decode (content/file/raw path) + EXIF rotate (`Kt:109-118`, `:347-404`) | detections; rejects "Could not decode image" / "Failed to open image" | Expo async queue |
| `annotateImageUri` | `annotateImageUri(uri, detections): Promise<string>` | draws green boxes + labels, JPEG 92 → `cacheDir/yolo_annot_<ts>.jpg` (`Kt:145-190`) | absolute file path | Expo async queue |
| `annotateVideoUri` | `annotateVideoUri(uri, frameReports: Array<{atMs, detections}>, confThresh): Promise<string>` | `VideoAnnotator.annotate` (`Kt:198-200`; `VA:48-196`) | path of `cacheDir/yolo_annot_vid_<ts>.mp4`; original path if no reports; rejects on `content://`, unreadable duration, empty output | Expo async queue |
| `unload` | `unload(): Promise<void>` | close interpreter + GPU delegate (`Kt:202-208`) | — | Expo async queue |

Platform stubs:
- **Web** (`modules/expo-yolo-tflite/src/ExpoYoloTfliteModule.web.ts:4-37`): every call throws "not available on web"; **`annotateVideoUri` is missing** (`DEV-11`).
- **iOS** (`modules/expo-yolo-tflite/ios/ExpoYoloTfliteModule.swift:7-41`): `isSupported`/`isLoaded` false; others throw "Android-only".

`ModelTensorReport` (`ExpoYoloTflite.types.ts:8-19`): `{ inputs, outputs: TensorInfo[]; inputShape: number[]; inputDtype: string; outputShape: number[]; outputDtype: string; numClasses: number; usingGpu?: boolean }`.

---

## 4. `YoloDetection` type

Declared at `modules/expo-yolo-tflite/src/ExpoYoloTflite.types.ts:21-30`; produced by `Detection.toMap()` (`Kt:676-684`).

| Field | Type | Meaning |
|---|---|---|
| `x` | number | **Top-left** x, normalised 0..1 of the **source image** (frame or decoded photo, after EXIF rotation) |
| `y` | number | **Top-left** y, normalised 0..1 |
| `width` | number | Normalised width (`clamp01(x1/srcW) − x`) |
| `height` | number | Normalised height |
| `classId` | number | 0–6 |
| `confidence` | number | Best class score (post-sigmoid if applied) |
| `label` | string | `LABELS[classId]` or `class_<id>` if out of range |

Evidence for top-left: `x0 = (cx − w/2 − padX) / scale` then `nx = clamp01(x0 / srcW)` (`Kt:608-616`). Persisted copy: `StoredYoloDetection` (`src/types/index.ts:65-73`) with identical fields.

---

## 5. Store and persistence contract

### 5.1 `scanStore` public surface
See [architecture.md §7](architecture.md#7-state-management). Screens depend on: `expectedCount`, `detections`, `yoloDetections`, `captureMedia`, `activeGalleryId`, `gallery`, `predictionLog`, and actions `completeCapture`, `openGalleryItem`, `removeGalleryItem`, `clearGallery`, `updateGalleryClassification`, `updateGalleryVideoReports`, `startScan`, `stopScan`, `resetScan`, `setExpectedCount`, `setYoloDetections`, `logPrediction`, `hydrateGallery` (`src/store/scanStore.ts:58-107`).

`completeCapture(media, expectedCount?, classification?, yoloDetections?, videoFrameReports?, trayDetections?)` (`src/store/scanStore.ts:81-89`, `:144-220`):
- `detections` = `trayDetections` if non-empty, **else `buildDummyDetections(count)`** (`:153-156`).
- classification stored if `index ≥ 0`; `locked = locked || score ≥ 0.5` (`:159-165`).
- Media copied to `documents/gallery`; list pruned to 20; index rewritten (`:179-192`).
- On persistence error: state still updated with the temp media, returns `null` (`:208-219`).

### 5.2 Gallery persistence schema

**Not AsyncStorage.** `expo-file-system` (`src/utils/galleryStorage.ts:1`):

| Item | Value |
|---|---|
| Directory | `Paths.document/gallery` (`:6`) |
| Index file | `gallery/index.json` — JSON array of `GalleryItem`, newest first (`:7`, `:67-73`) |
| Media file | `gallery/<id><ext>`; id = `cap_<ts36>_<rand6>` (`:139-141`); ext from kind/path (`:15-25`) |
| Versioning / migration | **None** — `JSON.parse` + `Array.isArray` check only (`:50-52`) |
| Load filter | items whose media file no longer exists are dropped (`:53-60`) |
| Retention | `MAX_GALLERY_ITEMS = 20` (`src/types/index.ts:62`); pruned tail media deleted (`:107-120`) |

`GalleryItem` (`src/types/index.ts:92-104`):
```ts
{ id: string; media: CaptureMedia; detections: TrayDetection[]; expectedCount: number; createdAt: number;
  classification?: StoredClassification; yoloDetections?: StoredYoloDetection[]; videoFrameReports?: VideoFrameReport[] }
```
`CaptureMedia` (`:50-59`): `{ kind: 'photo'|'video'; path; width?; height?; capturedAt; byteSize? }`.
`VideoFrameReport` (`:76-81`): `{ atMs; frameIndex; detections: StoredYoloDetection[] }`.
`TrayDetection` (`:37-46`): `{ sequence; colour: DayColour; confidence; frameTimestampMs?; modelLabel? }`.

### 5.3 `labelTracker` output
`TrackedLabel` (`src/utils/labelTracker.ts:14-28`): `{ label_sequence_number; day_colour; confidence_score; frame_timestamp; classId; label; x; y; width; height; lastSeenAt }`.
Matching (`:91-140`): for each detection, best unmatched track with IoU ≥ 0.28 (same class) or ≥ 0.55 (different class); matched track takes the new box; class/label/colour updated only if confidence ≥ stored confidence; unmatched detection creates a new track with the next sequence number. Converters: `trackedToTrayDetections` (`:143-151`), `trackedToStoredYolo` (`:153-163`), `yoloToTrayDetections` for stills (`:166-181`).

### 5.4 Prediction log
`PredictionLogEntry` (`src/types/index.ts:106-115`); in-memory only, newest first, max 80 (`src/store/scanStore.ts:25`, `:124-135`); skipped when `index < 0`.

---

## 6. Camera contract

| Output | Configuration | Consumer | Evidence |
|---|---|---|---|
| Frame | `pixelFormat: 'rgb'`, `targetResolution: {320, 240}`, `enablePreviewSizedOutputBuffers: false`, `enablePhysicalBufferRotation: true`, `dropFramesWhileBusy: true`, `onFrame` worklet | live detection | `src/app/camera.tsx:340-349` |
| Photo | `qualityPrioritization: 'balanced'`, `targetResolution: CommonResolutions.HD_4_3`; `capturePhoto({flashMode})` → `saveToTemporaryFileAsync()` | SNAP | `:198-201`, `:498-502` |
| Video | `useVideoOutput({ enableAudio: true })`; `createRecorder({})` → `startRecording(onFinished, onError)` | sweep | `:202`, `:599-669` |
| Preview | `<Camera resizeMode="contain" enableNativeZoomGesture torchMode …>`; `onStarted`, `onStopped`, `onError` | UI | `:872-892` |

Frame packet passed to native: `{ pixels: Uint8Array, width, height, stride = max(bytesPerRow, width*3), channels = stride ≥ width*4 ? 4 : 3, isBgra = pixelFormat includes 'bgra' }` (`:310-326`).

---

## 7. Out-of-scope integrations

| Integration | Exists in code? | Statement |
|---|---|---|
| Inventory system | No (only local derived views; static mock screen) | No integration exists; out of scope per HLD §1.3. |
| ERP | **No** — `inventory-updated.tsx` shows static text "Batch #BCH-8824 ledger synced with ERP" (`src/app/inventory-updated.tsx:250-253`) but performs no call | No integration exists; out of scope per HLD §1.3. The on-screen claim is inaccurate (`RV-03`). |
| Backend / cloud sync | No | No integration exists; out of scope per HLD §1.3. |
| Authentication service | No (mock screens) | No integration exists; not in HLD. |
| Notifications / operations / flights | No | No integration exists. |
