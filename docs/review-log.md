# ColorSweep — Review Log (as-built)

> 2026-09-27, branch `docs/as-built-documentation`, base commit `f155d8c`. This is a documentation-only review: **no code was changed**. Every finding is **Open** until the team triages it.
> No earlier review file (e.g. `docs/reviews/ui-architecture-review.md`) exists in the repo, so this log starts at `RV-01`.

**Severity:** Blocker (the app cannot deliver the HLD's core value) · Major (wrong or misleading behaviour, or a significant HLD deviation) · Minor (quality, maintainability or consistency).
**Resolution type:** `CODE-FIX` (the code should change) · `SPEC-CHANGE` (the HLD or specs should change to match the code) · `CONFIRM-SCOPE` (a product owner must decide).

`K` = `modules/expo-yolo-tflite/android/src/main/java/expo/modules/yolotflite/ExpoYoloTfliteModule.kt`
`VA` = `modules/expo-yolo-tflite/android/src/main/java/expo/modules/yolotflite/VideoAnnotator.kt`

## Summary

| Severity | Count |
|---|---|
| Blocker | 1 |
| Major | 9 |
| Minor | 16 |
| **Total** | **26** |

## Findings

| ID | Category | Severity | Location | Finding | Proposed resolution | Type | Status | Links |
|---|---|---|---|---|---|---|---|---|
| RV-01 | Build / ML | **Blocker** | `K:42`; `.gitignore:45-46`; commit `d874a9f` | The native module loads `best_int8_480.tflite`, but `*.tflite` is git-ignored and no model is in the repo, so a clean checkout cannot run inference. | Decide how the model is distributed (Git LFS, release artefact, or a download step) and document where it goes (`android/src/main/assets/`). | CODE-FIX + CONFIRM-SCOPE | Open | FR-18, DEV-02, TC-34 |
| RV-02 | Correctness | Major | `src/store/scanStore.ts:153-156`; `src/utils/scanHelpers.ts:10-29` | `completeCapture` falls back to `buildDummyDetections` when nothing was tracked, so the Summary can show **fabricated** label rows as though they were real results. | Remove the fallback. Show an empty state and "rescan" instead. | CODE-FIX | Open | FR-12, DEV-12, US-11-AC3, TC-32 |
| RV-03 | Scope / Trust | Major | `src/app/inventory-updated.tsx:156`, `:227-257` | This orphan screen shows hard-coded claims (ERP sync, ISO-22000, 0.18 s latency, batch `BCH-8824`, `#409-C`) that nothing in the code supports. | Remove it, or label it clearly as a design mock. | CONFIRM-SCOPE | Open | DEV-13, Q-09 |
| RV-04 | Security / Scope | Major | `src/app/login.tsx:23-25`, `:130-131`; `src/app/signup.tsx:27-30` | Login and sign-up are mocks. Any input navigates to `/home`, credentials are prefilled, and the "demo" hint is not enforced. The HLD has no authentication. | Confirm whether auth is in scope. If not, label these screens as a demo. If so, specify it (ties to the platform backend question). | CONFIRM-SCOPE | Open | DEV-13, Q-09 |
| RV-05 | Spec drift | Major | HLD §4 vs `K:42-47`; `AGENTS.md` (Model Migration tracker) | The HLD, `AGENTS.md` and the code describe three different model contracts (HLD: `640`/`8400`; AGENTS.md: `yolov8n_int8` float32 at `640`, `[1,11,8400]`; code: `best_int8_480`, `480`, `4725` anchors, `NUM_ATTRS=12`). | Update the HLD to the as-built contract (or change the model) and fix the tracker. As-built notes have been added to `AGENTS.md`. | SPEC-CHANGE | Open | DEV-01, CON-§2, FR-17 |
| RV-06 | ML correctness | Major | `K:45`, `:443-450` | `NUM_ATTRS = 4 + 7 + 1 = 12` is commented "box + objectness + classes", but YOLOv8 heads have no objectness term (4 + 7 = 11). The transposition check `outChannels == NUM_ANCHORS \|\| outAnchors == NUM_ATTRS` depends on this constant, so a standard 11-channel head may be mis-oriented or decoded with the wrong offset. | Read the channel count from the tensor shape, assert `4 + NUM_CLASSES`, and add a unit test with a fixture tensor. | CODE-FIX | Open | FR-17, TC-35 |
| RV-07 | Performance / Logging | Minor | `K:473-511` | A block marked "TEMP DEBUG" logs tensor statistics on **every** inference. That runs about 10 times a second in live mode, cutting throughput and flooding logcat. | Remove it or gate it behind a debug flag. | CODE-FIX | Open | NFR-01, ARCH-§13 |
| RV-08 | Consistency | Major | `K` (`CONF_THRESH 0.30`); `src/types/index.ts:32` (`0.85`); `src/theme/scanner.ts` (`VERIFY_THRESHOLD 0.85`); `src/utils/dayColourCalendar.ts` (`VERIFY 0.85`); `src/app/gallery.tsx:24` (`0.45`); `src/store/scanStore.ts:163` (`0.5`) | Six confidence thresholds with overlapping meanings are spread across layers. The HLD specifies one verification threshold. | Centralise thresholds into named constants (raw NMS vs "verified") and document them in contracts. | CODE-FIX + SPEC-CHANGE | Open | CON-§1, Q-02 |
| RV-09 | Maintainability | Minor | `K:52-61`; `src/utils/labelTracker.ts:4-12`, `:66`; `src/utils/dayColourCalendar.ts:36-100`; `src/theme/scanner.ts:39-47`, `:53-61` | The class order is defined in 5 places. They agree today, but nothing enforces it, and `labelTracker` silently maps unknown labels to `'Black'` (`:66`). | Use one source of truth (for example model metadata or a generated table) and treat an unknown label as an error. | CODE-FIX | Open | FR-07, TC-40 |
| RV-10 | Correctness | Minor | `src/app/gallery.tsx:148-211` | "Detect photos" re-runs detection on **annotated** JPEGs, whose burned-in boxes and labels can bias the model. | Store and re-detect the raw capture. | CODE-FIX | Open | FR-11 |
| RV-11 | Capability gap | Major | `VA:28`, `:97`, `:115` | The annotated video is re-encoded at 10 fps with **no audio** and is capped at 450 frames (≈ 45 s), so longer sweeps are silently truncated. | Confirm the audit requirements. At minimum, warn the user when the cap is reached. | CONFIRM-SCOPE + CODE-FIX | Open | FR-13, DEV-09, US-15 |
| RV-12 | UX | Minor | `src/app/camera.tsx:679-685`, `:1031-1032` | The button labelled "CANCEL · BACK" calls `handleFinish`, which stops the scan and **navigates to the Summary** — not a cancel. | Rename it to "FINISH", or add a real cancel. | CODE-FIX | Open | FR-12 |
| RV-13 | Audit | Minor | `src/app/summary.tsx:203-210`, `:444-451` | "Accept All as-is (Manual Override)" only resets the session and goes home. The override is not recorded anywhere. | Record who overrode, when, and which frames (ties to BR-06 traceability). | CODE-FIX + CONFIRM-SCOPE | Open | BR-06 |
| RV-14 | Data | Minor | `src/app/summary.tsx:213-215` | The session id is `#SCN-<expectedCount>` (zero-padded), so every session with the same count gets the same "id". | Generate a unique id (timestamp or UUID). | CODE-FIX | Open | FR-12, DEV-15 |
| RV-15 | Tracking | Minor | `src/app/camera.tsx:179`, `:596`; `src/utils/labelTracker.ts:40-41` | The label tracker is reset only when REC starts, and tracks never expire, so live-mode counts accumulate across the whole screen visit. | Reset the tracker on each session and add a time window. | CODE-FIX | Open | FR-10, DEV-08 |
| RV-16 | UI accuracy | Minor | `src/app/camera.tsx:873`, `:914-915` | Overlay boxes are enlarged to at least 60×30 px and drawn over a `contain` preview, so small boxes misstate the real object size. | Draw the true geometry and put only the label chip at a minimum size. | CODE-FIX | Open | FR-05, DEV-10 |
| RV-17 | Hygiene | Minor | `patches/react-native-fast-tflite+3.0.1.patch`; `assets/models/imagenet_labels.txt`; `src/hooks/useCentroidTracking.ts` (empty); unused `StatusBadge`, `AnimatedLogo`, `colorName.ts`, `CLASSIFY_LOCK_SCORE`, `isHighConfidence`, `ROTATION_DAYS`, `DAY_COLOUR_HEX`, `clearPredictionLog`, `galleryBytesUsed` | Dead code and leftovers from the fast-tflite era. | Delete them in a dedicated clean-up PR. | CODE-FIX | Open | ARCH-§19 |
| RV-18 | Platform parity | Minor | `modules/expo-yolo-tflite/src/ExpoYoloTfliteModule.web.ts:30` | The web stub implements `annotateImageUri` but not `annotateVideoUri`, and the iOS path throws. | Add the missing stub. Confirm that the app is Android-only. | CODE-FIX + CONFIRM-SCOPE | Open | CON-§3, DEV-11 |
| RV-19 | Quality | Major | repo root (no `__tests__`, no test script in `package.json`, no CI config) | There are no automated tests and no CI, so all 45 TCs are manual or not implemented. | Add Jest unit tests for the pure utils (tracker, calendar, NMS fixture) and a CI lint + typecheck job. | CODE-FIX | Open | GAP-02, docs/test-strategy.md |
| RV-20 | Performance | Minor | `src/app/camera.tsx:120`; `src/ml/useTensorDebug.ts:9-37` | `useTensorDebug()` runs on every Camera mount in release builds too. | Gate it on `__DEV__`. | CODE-FIX | Open | FR-17 |
| RV-21 | Docs | Minor | `README.md:33`; `package.json:53` (script points to a missing `scripts/reset-project.js`); `AGENTS.md` | README is the Expo template (`reset-project`, an "app" directory) and AGENTS.md has a stale model tracker. | As-built notes and ColorSweep sections have been added (this PR). Remove the dead script later. | SPEC-CHANGE | Open (docs updated) | — |
| RV-22 | Build reproducibility | Minor | `package.json:45` | `"@react-native-community/cli": "latest"` gives non-reproducible builds. | Pin an exact version. | CODE-FIX | Open | NFR-10 |
| RV-23 | Traceability | Minor | `src/store/scanStore.ts:25`, `:124-135`; `src/app/gallery.tsx:241` | The prediction log is in memory, capped at 80 entries, never persisted, and only its count is shown. | Confirm the HLD intent (debugging vs audit). Persist or export it if it is for audit. | CONFIRM-SCOPE | Open | FR-09, US-04-AC4 |
| RV-24 | Domain rules | Major | `src/utils/dayColourCalendar.ts:223-249` | Expiry and urgency rules (day-of-week → "expired/today/tomorrow") are implemented but appear in neither the HLD nor any confirmed spec. | The HACCP owner must confirm the shelf-life rule. | CONFIRM-SCOPE | Open | Q-07, TC-43 |
| RV-25 | Domain semantics | Minor | `src/utils/dayColourCalendar.ts:330-389` | Inventory "units" are **detection counts** from the last session, not stock quantities. | Relabel as "labels detected", or define a stock model. | CONFIRM-SCOPE | Open | Q-09 |
| RV-26 | ML runtime | Minor | `K:247-249`, `:275` | The GPU delegate is chosen by whether the file name contains `"int8"`, so renaming the asset silently changes the execution path. | Choose the delegate from the tensor dtype or a config flag. | CODE-FIX | Open | ADR-03, DEV-05, NFR-01 |

## Triage checklist (for the team)

- [ ] RV-01 — decide model distribution (blocks every inference TC)
- [ ] RV-02, RV-06 — correctness fixes before any pilot
- [ ] RV-03, RV-04, RV-24, RV-25 — product-owner scope decisions (`Q-09`, `Q-07`)
- [ ] RV-05 — approve the as-built model contract into the HLD
- [ ] RV-19 — agree on a minimum automated test gate
