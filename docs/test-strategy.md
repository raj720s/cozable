# ColorSweep — Test Strategy (as-built)

> **Status:** 2026-09-27, base commit `f155d8c`. Derived from HLD §8.4–8.6 and the acceptance criteria in [specs/requirements.md §5](../specs/requirements.md#5-user-stories-and-acceptance-criteria).

---

## 1. Test levels (HLD §8.4)

| Level | Purpose (HLD) | As-built tooling |
|---|---|---|
| 1. Model / tensor validation | Model loads with expected shapes and 7 classes | Manual: read `TENSORS:` log (`src/ml/ModelProvider.tsx:49-78`, `src/ml/useTensorDebug.ts:18-32`) |
| 2. Live inference | Frames reach `detectRgb`; valid, mapped detections | Manual: `[LIVE] detectRgb → N` log (`src/app/camera.tsx:242-247`) |
| 3. SNAP | Capture, URI, native inference, annotation, gallery, session | Manual |
| 4. Coordinate transformation | Boxes align (frame, preview, aspect, scaling, crop, mirroring) | Manual |
| 5. Model accuracy | Predictions vs ground truth | Outside the repo (training pipeline not in repo) |
| 6. Regression | Train → export → deploy → native → RN → UI after any model change | Manual |

---

## 2. Existing tests inventory

**There are no automated tests in the repository.** No `__tests__/`, no `*.test.ts(x)` / `*.spec.ts(x)`, no `android/src/test` or `androidTest` in the module, no `e2e/` or `.maestro/`, no test runner in `package.json` (`package.json:44-58`), and no CI (`.github/` absent).

Available static checks (not tests): `npm run lint` (`package.json:57`) and `npx tsc --noEmit`.

---

## 3. Test cases

Status: **Automated** · **Manual** (documented procedure only) · **Not yet implemented** (no procedure or harness exists). Because no harness exists, all cases are *Manual* or *Not yet implemented*.

| ID | AC | Level | Type | Preconditions | Steps | Expected result | Status |
|---|---|---|---|---|---|---|---|
| TC-01 | US-01-AC1 | E2E | Positive | Fresh install | Launch app | Splash hides after fonts + permission prompt + gallery hydrate, without waiting for model | Manual |
| TC-02 | US-01-AC2 | E2E | Positive | App launched | Wait on intro | After ~1.9 s route is `/login`; back exits | Manual |
| TC-03 | US-01-AC3 | E2E | Edge | Slow model load (e.g. large model) | Launch; go to Home | Home usable; camera shows "Loading model…" until loaded | Manual |
| TC-04 | US-02-AC1 | E2E | Positive | Permissions not yet asked | Launch | Camera then microphone prompts appear once | Manual |
| TC-05 | US-02-AC2 | E2E | Negative | Camera denied | Open camera | "Camera access required" + Allow / Open Settings | Manual |
| TC-06 | US-02-AC3 | E2E | Negative | Mic denied (cannot re-ask) | Tap START SWEEP | Alert with Open Settings; no recording | Manual |
| TC-07 | US-03-AC1 | E2E | Positive | Permissions granted | Open camera with count | Preview visible; "Starting camera…" then model status | Manual |
| TC-08 | US-03-AC2 | E2E | Negative | Device without selected lens (emulator) | Flip to missing lens | "No camera device" + Try other lens | Manual |
| TC-09 | US-03-AC3 | E2E | Negative | Force a camera session error | Trigger error | "Camera unavailable" with Retry / Open Settings / Go back | Not yet implemented (no fault injection) |
| TC-10 | US-04-AC1 | Live inference | Positive | Model loaded | Point at labels; watch logs | `[LIVE]` lines no more often than every 100 ms | Manual |
| TC-11 | US-04-AC2 | Unit (proposed) | Boundary | — | Simulate slow `detectRgb` (> 100 ms) | No second call while first in flight | Not yet implemented |
| TC-12 | US-04-AC3 | Unit (proposed) | Negative | `isLoaded = false` | Deliver packet | Dropped; busy flag cleared | Not yet implemented |
| TC-13 | US-05-AC1 | Coordinate | Positive | Label in view | Observe overlay | Green box ≥ 85 %, amber below; label "Colour : Day NN%" | Manual |
| TC-14 | US-05-AC2 | Coordinate | Positive | Front camera | Move label left→right | Box moves in the same on-screen direction (mirrored) | Manual |
| TC-15 | US-05-AC3 | Unit (proposed) | Boundary | Tiny detection | Render | Box drawn at ≥ 60×30 px | Not yet implemented |
| TC-16 | US-06-AC1 | Unit (proposed, Kotlin) | Positive | — | Decode synthetic output with class k max for k=0..6 | Label = `LABELS[k]` in approved order | Not yet implemented |
| TC-17 | US-06-AC2 | Unit (proposed, Kotlin) | Edge | — | Two boxes, different classes, IoU 0.5 | Only higher-confidence kept | Not yet implemented |
| TC-18 | US-07-AC1 | SNAP | Positive | Model loaded | Tap camera button | Summary opens; gallery item has photo + boxes | Manual |
| TC-19 | US-07-AC2 | SNAP | Negative | Force `detectImageUri` error | SNAP | Live boxes used; capture saved | Not yet implemented |
| TC-20 | US-07-AC3 | SNAP | Negative | Recording | Tap camera button | Button disabled | Manual |
| TC-21 | US-08-AC1 | SNAP | Positive | ≥ 1 detection | SNAP; open gallery item | Saved image shows drawn boxes + labels | Manual |
| TC-22 | US-08-AC2 | SNAP | Negative | Annotation throws | SNAP | Raw photo saved | Not yet implemented |
| TC-23 | US-09-AC1 | Unit (proposed) | Positive | Mock `expo-file-system` | `completeCapture` | Media copied to `gallery/<id>.<ext>`; `index.json` starts with new item | Not yet implemented |
| TC-24 | US-09-AC2 | Unit (proposed) | Boundary | 20 items stored | Add 1 | 20 remain; oldest media deleted | Not yet implemented |
| TC-25 | US-09-AC3 | E2E | Positive | ≥ 1 item | Long-press → Delete | Item and file removed | Manual |
| TC-26 | US-10-AC1 | Unit (proposed) | Positive | Store with data | `startScan()` | detections/yolo/capture/activeId cleared | Not yet implemented |
| TC-27 | US-10-AC2 | Unit (proposed) | Positive | — | Feed `LabelTracker` same box ±small jitter for 20 frames | `count === 1` | Not yet implemented |
| TC-28 | US-10-AC2 | Unit (proposed) | Edge | — | Same box, class changes, IoU 0.5 | New track (cross-class needs ≥ 0.55) | Not yet implemented |
| TC-29 | US-10-AC3 | E2E | Positive | Previous sweep done | START SWEEP again | Distinct counter restarts at 0 | Manual |
| TC-30 | US-11-AC1 | Unit (proposed) | Positive | 7 distinct, expected 9 | Render summary | "7 / 9", "78% COVERAGE" | Not yet implemented |
| TC-31 | US-11-AC2 | E2E | Positive | ≥ 1 row < 85 % | Open summary | Row "Flagged"; RE-SCAN FLAGGED (n) visible | Manual |
| TC-32 | US-11-AC3 | Unit (proposed) | Negative | No detections | Tap "CANCEL · BACK" / SNAP with no boxes | Summary shows no rows. **Currently fails** (dummy rows) | Not yet implemented |
| TC-33 | US-12-AC1 | Model | Positive | Model file present | Launch; read logs | `[MODEL] load done`, warm-up done, state loaded | Manual |
| TC-34 | US-12-AC2 | Model | Negative | Remove model asset | Launch; open camera | State error; "Model failed" | Manual |
| TC-35 | US-12-AC3 | Model | Positive | Model present | Read `TENSORS:` | input `[1,3,480,480]`, output `[1,11,4725]`, numClasses 7 | Manual |
| TC-36 | US-13-AC1 | Stability | Edge | Empty scene | Scan 60 s | No crash; overlay empty; logs continue | Manual |
| TC-37 | US-13-AC2 | Stability | Edge | Scanning | Background app; return | Camera stops, torch off; resumes | Manual |
| TC-38 | US-14-AC1 | Performance | Boundary | Scanning | Measure `[LIVE]` timestamps 60 s | ≤ 10 inferences/s; never overlapping | Manual |
| TC-39 | US-14-AC2 | Performance | Positive | Reference device | Measure native and end-to-end latency | ≤ 120 ms native, ≤ 150 ms E2E | Not yet implemented (no instrumentation) |
| TC-40 | FR-07 | Unit (proposed) | Positive | — | Compare `LABELS` (Kotlin) with `CLASS_ID_TO_DAY_COLOUR`, `DAY_COLOUR_CLASSES`, `CLASS_COLORS_BY_ID` | Identical order | Not yet implemented |
| TC-41 | US-15-AC1 | E2E | Positive | Model loaded | Record 10 s sweep | ~20 frame reports; summary lists them; annotated MP4 plays | Manual |
| TC-42 | US-15-AC2 | E2E | Edge | Model loaded | Record 60 s sweep | Annotated MP4 is ≤ ~45 s and silent (documents current limit) | Manual |
| TC-43 | Q-07 | Unit (proposed) | Positive | Fixed date Wed | `expiryForClassId` for each class | Sun/Mon/Tue expired; Wed today; Thu tomorrow; Fri/Sat this-week | Not yet implemented |
| TC-44 | US-04-AC4 | Unit (proposed) | Positive | — | Top class same, Δconf 0.05 then 0.12 | Only the 0.12 change logs an entry | Not yet implemented |
| TC-45 | US-13-AC3 | E2E | Positive | Airplane mode on; model present | Live scan 30 s; SNAP once | Detections and SNAP save work; no network errors | Manual |

---

## 4. HLD §8.5 E2E acceptance checklist

| Area (HLD p.54) | Validation | Covering TCs |
|---|---|---|
| Application startup | Launches successfully | TC-01, TC-02, TC-03 |
| Permissions | Handled correctly | TC-04, TC-05, TC-06 |
| Camera | Preview initialises | TC-07, TC-08, TC-09 |
| Live detection | Labels detected from live frames | TC-10, TC-11, TC-12, TC-44 |
| Bounding boxes | Align with labels | TC-13, TC-14, TC-15 |
| Classification | Correct day-colour class | TC-16, TC-17, TC-40 |
| SNAP | Captured image processed independently | TC-18, TC-19, TC-20 |
| Annotation | Boxes rendered on image | TC-21, TC-22 |
| Gallery | Captured result available | TC-23, TC-24, TC-25 |
| Session | Detection info consistent | TC-26, TC-27, TC-28, TC-29 |
| Summary | Final info correct | TC-30, TC-31, TC-32 |
| Model | Tensor configuration matches | TC-33, TC-34, TC-35 |
| Stability | Continues after frames without detections | TC-36, TC-37, TC-45 |
| Performance | Within baseline | TC-38, TC-39 |

---

## 5. Quality gates

| Gate | Criteria | Status |
|---|---|---|
| Build (HLD §8.6) | Android build succeeds; native module loads; model packaged | **Not in place** — no CI; model file absent from repo |
| Model (HLD §8.6) | Shapes confirmed; 7 classes mapped; loads on device | Manual only (log inspection) |
| Functional (HLD §8.6) | Live, SNAP, boxes, gallery, summary work | Manual only |
| Performance (HLD §8.6) | Responsive preview; throttling works; no backlog | Manual only |
| E2E (HLD §8.6) | Start → Live → Capture/Review → Session update → Summary | Manual only |
| Lint | `npm run lint` clean | Available; **Recommended** as a CI gate |
| Type-check | `npx tsc --noEmit` clean | Available; **Recommended** as a CI gate |
| Unit coverage | ≥ 70 % for `utils/`, `store/` | **Recommended** (no harness) |
| Kotlin unit tests | decode / NMS / letterbox | **Recommended** |
| Model artefact check | file exists, name matches `MODEL_ASSET`, checksum, shapes | **Recommended** |
| Security scan | dependency audit | **Recommended** |

---

## 6. Test-data approach

- **Real images:** HLD §8.4.5 recommends collecting **300+ real tray images** across lighting, angle and position before the next training cycle. None are in the repo.
- **Synthetic:** unit tests for `labelTracker`, `dayColourCalendar`, summary coverage and Kotlin decode/NMS can use synthetic boxes and tensors (no images required).
- **Golden set (recommended):** a small fixed set of labelled still images per class for SNAP regression (TC-18, TC-21, TC-35).

---

## 7. Gaps (prioritised)

1. **No automated tests or CI** at any level (`GAP-02`).
2. **Summary fabricates rows** — TC-32 would fail today (`RV-02`).
3. **No model-artefact check** — clean builds lack the model (`RV-01`).
4. **Pure logic untested:** `labelTracker`, `dayColourCalendar` expiry, coverage maths, prediction-log rule, gallery prune.
5. **Kotlin decode/NMS/transposition untested** (notably the `NUM_ATTRS = 12` fallback, `RV-06`).
6. **No performance instrumentation** beyond the first-call log (NFR-01/03/04).
7. **No coordinate-alignment test harness** (contain vs cover, mirroring, min box).
