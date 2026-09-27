# ColorSweep — Traceability Matrix (as-built)

> 2026-09-27, base commit `f155d8c`. Sources: [requirements](../specs/requirements.md), [architecture](../specs/architecture.md), [contracts](../specs/contracts.md), [test strategy](test-strategy.md).

## Health summary

| Metric | Count |
|---|---|
| Business requirements (BR) | 10 |
| Functional requirements (FR) | 19 — Implemented 10 · Deviates 3 · Partial 5 · Not implemented 1 |
| User stories (US) | 15 |
| Acceptance criteria (AC) | 42 |
| Test cases (TC) | 45 — Automated **0** · Manual 26 · Not yet implemented 19 |
| ACs with no automated test | **42 / 42** |
| ACs covered only by *Not yet implemented* TCs | 16 |
| FRs not implemented | 1 (FR-18 model packaging in repo) |
| Deviations from HLD | 15 (`DEV-01` … `DEV-15`) |
| Review findings | 26 (`RV-01` … `RV-26`) |

## Matrix

`K` = `modules/expo-yolo-tflite/android/src/main/java/expo/modules/yolotflite/ExpoYoloTfliteModule.kt`

| BR | FR | US / AC | Spec section | Implementation | TC | Status |
|---|---|---|---|---|---|---|
| BR-01 / BR-07 | FR-01 | US-10-AC1; US-11-AC1 | ARCH-§10(b); ARCH-§7.3 | `src/app/(tabs)/home.tsx`, `src/app/camera.tsx`, `src/store/scanStore.ts` | TC-26, TC-30 | Implemented (entry point deviates, DEV-06) |
| BR-01 | FR-02 | US-10-AC1 | ARCH-§7; CON-§5.1 | `src/store/scanStore.ts` | TC-26 | Implemented |
| BR-01 / BR-09 | FR-03 | US-01-AC1; US-02-AC1; US-02-AC2; US-02-AC3 | ARCH-§10(a); ARCH-§10(g) | `src/app/_layout.tsx`, `src/app/camera.tsx` | TC-01, TC-04, TC-05, TC-06 | Implemented |
| BR-02 / BR-09 | FR-04 | US-04-AC1; US-04-AC2; US-04-AC3; US-14-AC1 | ARCH-§9; CON-§6 | `src/app/camera.tsx` | TC-10, TC-11, TC-12, TC-38 | Deviates (DEV-03, DEV-04) |
| BR-02 | FR-05 | US-05-AC1; US-05-AC2; US-05-AC3 | ARCH-§11 | `src/app/camera.tsx` | TC-13, TC-14, TC-15 | Partial (DEV-10) |
| BR-03 | FR-06 | US-06-AC1; US-06-AC2 | CON-§1; CON-§2 | `K`, `src/app/camera.tsx` | TC-16, TC-17 | Implemented |
| BR-03 | FR-07 | US-06-AC1 | CON-§1 | `K`, `src/utils/labelTracker.ts`, `src/utils/dayColourCalendar.ts`, `src/theme/scanner.ts` | TC-40 | Partial (dataset not in repo) |
| BR-04 / BR-06 | FR-08 | US-07-AC1; US-07-AC2; US-07-AC3; US-08-AC1; US-08-AC2 | ARCH-§10(d); CON-§3 | `src/app/camera.tsx`, `K` | TC-18, TC-19, TC-20, TC-21, TC-22 | Implemented |
| BR-05 | FR-09 | US-04-AC4 | ARCH-§9 step 12; CON-§5.4 | `src/app/camera.tsx`, `src/store/scanStore.ts` | TC-44 | Partial (not persisted, count only) |
| BR-05 / BR-07 | FR-10 | US-10-AC2; US-10-AC3 | ARCH-§10(c); CON-§5.3 | `src/utils/labelTracker.ts`, `src/app/camera.tsx` | TC-27, TC-28, TC-29 | Implemented (DEV-08) |
| BR-06 | FR-11 | US-09-AC1; US-09-AC2; US-09-AC3 | ARCH-§10(d); CON-§5.2 | `src/app/gallery.tsx`, `src/utils/galleryStorage.ts` | TC-23, TC-24, TC-25 | Deviates (DEV-07) |
| BR-07 | FR-12 | US-11-AC1; US-11-AC2; US-11-AC3 | ARCH-§10(b) | `src/app/summary.tsx`, `src/store/scanStore.ts`, `src/utils/scanHelpers.ts` | TC-30, TC-31, TC-32 | Deviates (DEV-12) |
| BR-08 | FR-13 | US-15-AC1; US-15-AC2 | ARCH-§10(e); CON-§3 | `src/app/camera.tsx`, `src/app/summary.tsx`, `src/components/CaptureVideoPlayer.tsx`, `VideoAnnotator.kt` | TC-41, TC-42 | Implemented (plus DEV-09 additions) |
| BR-09 | FR-14 | US-13-AC3 | ARCH-§2 principle 1; ARCH-§15 | whole app (no network calls) | TC-45 | Implemented |
| BR-09 | FR-15 | US-13-AC1; US-13-AC2 | ARCH-§12 | `src/app/camera.tsx` | TC-36, TC-37 | Implemented |
| BR-10 | FR-16 | US-01-AC3; US-12-AC1 | ARCH-§8 | `src/ml/ModelProvider.tsx` | TC-03, TC-33 | Implemented |
| BR-10 | FR-17 | US-12-AC3 | CON-§2 | `src/ml/useTensorDebug.ts`, `src/ml/ModelProvider.tsx` | TC-35 | Partial (logged, not asserted; DEV-01) |
| BR-10 | FR-18 | US-12-AC2 | ARCH-§16; CON-§2 | `K` (`MODEL_ASSET`), `.gitignore` | TC-34 | **Not implemented in repo** (DEV-02) |
| BR-09 | FR-19 | US-03-AC1; US-03-AC2; US-03-AC3; US-12-AC2 | ARCH-§12 | `src/app/camera.tsx`, `src/ml/ModelProvider.tsx` | TC-07, TC-08, TC-09, TC-34 | Partial (GAP-07) |
| BR-01 | FR-03 / FR-16 | US-01-AC2 | ARCH-§5.1; ARCH-§10(a) | `src/app/index.tsx` | TC-02 | Implemented (DEV-06) |
| BR-09 | FR-04 | US-14-AC2 | ARCH-§14 | `K` | TC-39 | TBD — not measured |

### AC → TC coverage check

| AC | TC | AC | TC | AC | TC |
|---|---|---|---|---|---|
| US-01-AC1 | TC-01 | US-06-AC1 | TC-16, TC-40 | US-11-AC1 | TC-30 |
| US-01-AC2 | TC-02 | US-06-AC2 | TC-17 | US-11-AC2 | TC-31 |
| US-01-AC3 | TC-03 | US-07-AC1 | TC-18 | US-11-AC3 | TC-32 |
| US-02-AC1 | TC-04 | US-07-AC2 | TC-19 | US-12-AC1 | TC-33 |
| US-02-AC2 | TC-05 | US-07-AC3 | TC-20 | US-12-AC2 | TC-34 |
| US-02-AC3 | TC-06 | US-08-AC1 | TC-21 | US-12-AC3 | TC-35 |
| US-03-AC1 | TC-07 | US-08-AC2 | TC-22 | US-13-AC1 | TC-36 |
| US-03-AC2 | TC-08 | US-09-AC1 | TC-23 | US-13-AC2 | TC-37 |
| US-03-AC3 | TC-09 | US-09-AC2 | TC-24 | US-13-AC3 | TC-45 |
| US-04-AC1 | TC-10 | US-09-AC3 | TC-25 | US-14-AC1 | TC-38 |
| US-04-AC2 | TC-11 | US-10-AC1 | TC-26 | US-14-AC2 | TC-39 |
| US-04-AC3 | TC-12 | US-10-AC2 | TC-27, TC-28 | US-15-AC1 | TC-41 |
| US-04-AC4 | TC-44 | US-10-AC3 | TC-29 | US-15-AC2 | TC-42 |
| US-05-AC1 | TC-13 | | | | |
| US-05-AC2 | TC-14 | | | | |
| US-05-AC3 | TC-15 | | | | |

Additional TCs not bound to a user-story AC: TC-40 (FR-07 class-map consistency), TC-43 (expiry rule, `Q-07`).

## HLD coverage (§1.1 – §8.6)

Every HLD subsection maps to at least one as-built section. **49 / 49 subsections covered.** HLD §9 appears in the TOC (p.2) but is missing from the document (`GAP-01`).

| HLD § | Topic | Covered in |
|---|---|---|
| 1.1–1.2 | Purpose, objectives | REQ BR-01…BR-10; docs/business-value.md §1–2 |
| 1.3 | Scope (in/out) | REQ §7 (not in HLD); ARCH-§18 DEV-13; CON-§7 |
| 1.4 | Key capabilities | REQ FR-01…FR-19 |
| 2.1, 2.5 | High-level architecture, component relationships | ARCH-§1 (diagrams) |
| 2.2 | Principles | ARCH-§2 (conformance), ARCH-§20 |
| 2.3 | Major components | ARCH-§6, ARCH-§8 |
| 2.4 | Technology stack | ARCH-§3 |
| 3.1 | React Native / Expo layer | ARCH-§3, ARCH-§4 |
| 3.2–3.3 | Screens, navigation | ARCH-§5.1–5.3 |
| 3.4 | State management | ARCH-§7; CON-§5 |
| 3.5 | Hooks | ARCH-§6; DEV-08 |
| 3.6 | UI / component layer | ARCH-§6 |
| 3.7 | ML integration in app | ARCH-§8; DEV-14 |
| 4.1–4.2 | Model overview, YOLOv8 | CON-§2; DEV-01 |
| 4.3 | Training pipeline | CON-§1 (dataset not in repo); ai-vs-human-log §3 |
| 4.4 | Model classes | CON-§1 |
| 4.5 | TFLite / LiteRT packaging | CON-§2; ARCH-§16; DEV-02 |
| 4.6–4.7 | On-device inference, AI/app boundary | ARCH-§8, ARCH-§9 |
| 5.1–5.2 | Native overview, VisionCamera | ARCH-§9; CON-§6; DEV-04 |
| 5.3 | Expo native module API | CON-§3; DEV-11 |
| 5.4 | Kotlin inference layer | CON-§2; ARCH-§8 |
| 5.5 | JSI / native bridge | CON-§3 (async Expo module calls), ARCH-§9 (worklet → `scheduleOnRN`) |
| 5.6–5.7 | Camera, frame processing | ARCH-§9; DEV-03 |
| 6.1, 6.7 | Workflow overview, end-to-end | ARCH-§10 |
| 6.2 | Live detection flow | ARCH-§10(c) |
| 6.3 | SNAP flow | ARCH-§10(d) |
| 6.4 | Video flow | ARCH-§10(e); DEV-09 |
| 6.5 | Detection / coordinates | ARCH-§11; DEV-10 |
| 6.6 | Scan session flow | ARCH-§7.3, ARCH-§10(b); DEV-15 |
| 7.1–7.3 | Performance, frame rate, on-device | ARCH-§14; NFR-01…NFR-04 |
| 7.4 | Permissions | ARCH-§10(g), ARCH-§15 |
| 7.5–7.6 | Error handling, reliability | ARCH-§12; GAP-07 |
| 8.1–8.3 | Dev environment, Android build, model deployment | ARCH-§16; README "Running ColorSweep" |
| 8.4 | Testing strategy | docs/test-strategy.md §1 |
| 8.5 | E2E validation | docs/test-strategy.md §4 |
| 8.6 | Quality gates | docs/test-strategy.md §5 |
| 9 | Limitations, risks, roadmap | **Missing in HLD** (`GAP-01`); derived in ARCH-§19–20 |

## Gaps

1. **No automated tests** — every AC relies on manual or not-yet-implemented cases (`GAP-02`).
2. **FR-18 not implemented in repo** — model file absent; FR-16/17 and every inference AC depend on it (`RV-01`).
3. **US-11-AC3 fails as-built** — fabricated summary rows (`RV-02`).
4. **NFR-01/03/04 unmeasured** (`GAP-05`).
5. **Scope conflicts** (login, sign-up, dashboard, inventory, use-first, inventory-updated, expiry) have **no BR/FR** by design — they await confirmation (`Q-09`).
6. **FR-07** cannot be fully verified until `data.yaml` / model metadata is available.
