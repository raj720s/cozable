This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

---

## 🚧 MODEL MIGRATION — CHANGE TRACKER

> **Read this first.** The YOLO model was swapped from a COCO 80-class Ultralytics export to a custom 7-class "day-colour" export. Any code that still assumes 80 classes, the COCO label list, or the old asset name is stale. Track progress here.

### Target contract (source of truth)

| Property | Value |
|---|---|
| Model file | `best_float32.tflite` (Ultralytics `nms=False, int8=False`) |
| Asset path | `modules/expo-yolo-tflite/android/src/main/assets/yolov8n_int8.tflite` |
| Input shape | `[1, 3, 640, 640]` float32, NCHW, 0–1, letterboxed, pad ≈ 114/255 |
| Output shape | `[1, 11, 8400]` float32 (`4 box attrs + 7 classes`) |
| Class count | `7` |
| Class order | `0 Black : Sunday`, `1 Blue : Monday`, `2 Brown : Thursday`, `3 Green : Friday`, `4 Orange : Saturday`, `5 Red : Wednesday`, `6 Yellow : Tuesday` |
| NMS | Done in Kotlin (model does NOT include NMS) |
| Task | `detect` |

### TODO checklist

- [x] **Model file** copied to `modules/expo-yolo-tflite/android/src/main/assets/yolov8n_int8.tflite`
  - [x] File is the **float32** export (`best_float32.tflite`), NOT the old int8 asset
  - [x] File size ≈ 12 MB (nano) — confirm with `ls -la` (~12.3 MB)
- [x] **Delete Metro-bundled copy** at `assets/models/best.tflite` (never bundle `.tflite` via Metro for YOLO)
- [x] **Kotlin: class count** — set `NUM_CLASSES = 7` (was `80`)
- [x] **Kotlin: label list** — replace `COCO_CLASSES` with the 7 labels in the order above
- [x] **Kotlin: output buffer** — change `Array(84)` → `Array(11)` (or use `outputTensor.shape()[1]` for dynamic)
- [x] **Kotlin: loops using `84` or `80`** — audit the file:
  - [x] `for (c in 0 until 80)` → `for (c in 0 until NUM_CLASSES)`
  - [x] `Array(1) { Array(84) ... }` → `Array(1) { Array(11) ... }`
  - [x] Any `4 + 80` arithmetic → `4 + NUM_CLASSES`
- [x] **Kotlin: label bounds check** — ensure `LABELS[classId]` cannot throw (guard `classId in 0 until NUM_CLASSES`)
- [x] **Kotlin: model asset name** — confirm `MODEL_ASSET = "yolov8n_int8.tflite"` still matches the file you placed
  - [x] If you renamed the file, update the constant
- [ ] **Tensor shapes verified at runtime** — log `getTensorInfo()` via `useTensorDebug()` in `camera.tsx` and confirm:
  - [ ] `inputShape = [1, 3, 640, 640]`
  - [ ] `outputShape = [1, 11, 8400]`
  - [ ] `numClasses = 7`
- [ ] **Rebuild** — `npx expo run:android` (Metro reload alone is NOT enough for Kotlin/asset changes)
- [ ] **Smoke test** — camera → SNAP → gallery:
  - [ ] No crash on model load
  - [ ] `detectImageUri` returns `[]` (expected — model under-trained)
  - [ ] `annotateImageUri` returns a valid JPEG path
  - [ ] Gallery renders the saved photo + empty `yoloDetections` metadata
- [x] **TypeScript sync** — `ExpoYoloTflite.types.ts` and the JS `declare class` still match the Kotlin signature
- [x] **Run checks** — `npx expo lint && npx tsc --noEmit` clean

### Known stale references to hunt down

Search the codebase for these and fix any hits outside of this file:

| Search term | Expected change |
|---|---|
| `84` (outside comments) | → `11` or `4 + NUM_CLASSES` |
| `COCO` | → remove / replace with custom labels |
| `80` next to tensor or class code | → `7` |
| `person`, `car`, `dog`, `bicycle` | → COCO labels, should not appear anywhere in app code |
| `yolov8n_int8` in comments saying "int8" | → note the actual file is float32 unless you re-export int8 later |

```bash
# Quick grep helper
rg -n "\b(84|80)\b|COCO|person|bicycle" --glob '!node_modules' --glob '!AGENTS.md'
```
