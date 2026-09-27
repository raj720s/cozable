import { useMemo } from 'react';
import { useScanStore } from '../store/scanStore';
import { VERIFY_THRESHOLD } from '../theme/scanner';
import { buildOpsSnapshot, type OpsSnapshot } from '../utils/dayColourCalendar';

/** Live ops view: today/week rotation + stock rolled up from this week's scans. */
export function useDayColourOps(nowMs?: number): OpsSnapshot {
  const gallery = useScanStore((s) => s.gallery);
  // Stable calendar day key so the snapshot refreshes after midnight without a new Date each render.
  const dayKey =
    nowMs != null ? new Date(nowMs).toDateString() : new Date().toDateString();

  return useMemo(() => {
    const from = nowMs != null ? new Date(nowMs) : new Date();
    return buildOpsSnapshot(gallery, from, VERIFY_THRESHOLD);
  }, [gallery, dayKey, nowMs]);
}
