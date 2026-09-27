# ColorSweep — Business Value

> Grounded in the HLD (§1.1 Purpose, §1.2 Objectives, §1.3 Scope, §8.4 Testing Strategy). **No figures are invented.** Every quantitative input is **TBD — Requires confirmation** and must come from pilot measurement or operations data.

## 1. Problem

In food-service operations, trays carry **day-of-week colour stickers** (HACCP-style day-dot labelling). Staff check them **by eye** to confirm the right day colour, which is slow and inconsistent (HLD §1.1). ColorSweep aims to provide "a fast, consistent, and automated inspection mechanism that reduces dependency on manual visual verification" (HLD §1.1, p.2).

## 2. Beneficiaries

| Beneficiary | Value (HLD objective) | As-built support |
|---|---|---|
| Tray-line operators | Less manual inspection effort; immediate visual feedback (§1.2 obj. 4) | Live boxes on the preview (FR-04/05, `src/app/camera.tsx:291-349`, `:872-956`) |
| Supervisors / QA | Traceable scan results: annotated images plus metadata (§1.2 obj. 5) | SNAP annotation and gallery (FR-08/11); annotated sweep video (FR-13) |
| Food-safety compliance | Consistent day-colour classification into 7 fixed classes (§1.2 obj. 3) | 7-class model contract (FR-06/07, `ExpoYoloTfliteModule.kt:52-61`) |
| Operations with unreliable connectivity | Core detection works offline (§1.1, on-device architecture) | No network calls (FR-14) |
| Product / platform team | A foundation for multi-tray, QR, cloud and iOS (§1.2 obj. 7) | Roadmap only; out of scope (§1.3) |

## 3. Impact model (formula, inputs TBD)

```
Time saved per shift  = trays_per_shift × (t_manual − t_colorsweep)
Error reduction       = trays_per_shift × (err_rate_manual − err_rate_colorsweep)
Net value per site/yr = shifts_per_year × (Time saved × labour_cost_per_hour
                        + Error reduction × cost_per_missed_label)
                        − (device + support + model-maintenance cost)
```

| Input | Value | Source |
|---|---|---|
| `trays_per_shift` | TBD — Requires confirmation | Operations data |
| `t_manual` (seconds per tray, manual check) | TBD — Requires confirmation | Pilot time-and-motion study |
| `t_colorsweep` (seconds per tray with the app) | TBD — Requires confirmation | Pilot measurement (NFR-01 / TC-39) |
| `err_rate_manual` | TBD — Requires confirmation | QA audit records |
| `err_rate_colorsweep` | TBD — Requires confirmation | Model accuracy on ground truth (HLD §8.4 item 5) |
| `cost_per_missed_label` | TBD — Requires confirmation | Food-safety / waste owner |
| `labour_cost_per_hour`, `shifts_per_year` | TBD — Requires confirmation | Finance |
| Device, support and model-maintenance cost | TBD — Requires confirmation | IT / ML owner |

> The HLD contains no ROI, accuracy or time-saving figures. Do not quote any until the pilot produces them.

## 4. Adoption path

| Stage | Exit criterion | Dependencies |
|---|---|---|
| 0. Make it buildable | Model distributed with the build (`RV-01`); fabricated summary rows removed (`RV-02`) | FR-18, FR-12 |
| 1. Controlled pilot (one site, one line) | HLD §8.5 end-to-end checklist passes; baseline `t_manual` / `err_rate_manual` recorded | docs/test-strategy.md |
| 2. Data collection | **300+ real tray images** across lighting, angle and position variations (HLD §8.4 item 5, p.52) | Label Studio annotation owner (TBD) |
| 3. Retrain and re-validate | New model passes the HLD §8.6 quality gates and the contract checks in contracts.md §2 | ML owner (TBD) |
| 4. Rollout | Measured impact inputs filled in §3; scope decisions `Q-09` resolved | Product owner |
| 5. Roadmap | Multi-tray, QR, cloud sync, iOS (HLD §1.2 obj. 7; out of scope in §1.3) | Separate HLD revision |

## 5. Limitations on the value claim

- **The model is data-limited** (HLD §8.4, p.52), so accuracy in real conditions is unproven.
- **The model is not in the repo** (`RV-01`), so the value cannot be demonstrated from a clean checkout.
- **Mock screens** (login, sign-up, inventory-updated, inventory units) suggest capabilities such as ERP sync, compliance certification and stock management that **do not exist** (`RV-03`, `RV-04`, `RV-25`, docs/ai-vs-human-log.md §4). They must not appear in business cases.
- **No audit trail** for manual overrides (`RV-13`), and the annotated video has no audio and is capped at ≈ 45 s (`RV-11`). Both limit its value as compliance evidence.
- **Expiry and urgency rules** in the app are unconfirmed (`RV-24`, `Q-07`).
- Android-only; iOS is out of scope (HLD §1.3).
