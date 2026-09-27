import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../components/AppIcon';
import { CaptureVideoPlayer } from '../components/CaptureVideoPlayer';
import { useScanStore } from '../store/scanStore';
import {
  CLASS_COLORS_BY_ID,
  colors,
  fonts,
  VERIFY_THRESHOLD,
} from '../theme/scanner';
import {
  CONFIDENCE_THRESHOLD,
  type StoredYoloDetection,
  type TrayDetection,
} from '../types';
import { expiryForClassId, shortDayColourLabel } from '../utils/dayColourCalendar';
import { describeCapture, toMediaUri } from '../utils/scanHelpers';

type ListItem =
  | { kind: 'yolo'; det: StoredYoloDetection; index: number }
  | { kind: 'tray'; det: TrayDetection };

function shortLabel(label: string): string {
  return shortDayColourLabel(label);
}

function YoloTrayRow({
  det,
  index,
  flagged,
}: {
  det: StoredYoloDetection;
  index: number;
  flagged: boolean;
}) {
  const color = CLASS_COLORS_BY_ID[det.classId] ?? colors.primary;
  const pct = (det.confidence * 100).toFixed(0);
  const expiry = expiryForClassId(det.classId);
  return (
    <View style={[styles.trayRow, flagged && styles.trayRowFlagged]}>
      <View style={[styles.trayStrip, { backgroundColor: color }]} />
      <View style={styles.trayMeta}>
        <View style={styles.trayTitleRow}>
          <Text style={styles.trayIndex}>#{index + 1}</Text>
          <Text style={styles.trayTitle} numberOfLines={1}>
            {shortLabel(det.label)}
          </Text>
        </View>
        <Text style={styles.traySub}>
          {expiry?.deliveryLabel ?? `class ${det.classId}`} ·{' '}
          {expiry?.expiresLabel ?? '—'}
        </Text>
        {flagged ? (
          <Text style={styles.flagHint}>Below {Math.round(VERIFY_THRESHOLD * 100)}% threshold</Text>
        ) : null}
      </View>
      <View style={styles.trayRight}>
        <Text style={[styles.trayPct, flagged && styles.trayPctFlagged]}>{pct}%</Text>
        <View style={[styles.badge, flagged ? styles.badgeFlagged : styles.badgeOk]}>
          <Text style={[styles.badgeText, flagged && styles.badgeTextFlagged]}>
            {flagged ? 'Flagged' : 'Verified'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function DistinctTrayRow({ det }: { det: TrayDetection }) {
  const high = det.confidence >= CONFIDENCE_THRESHOLD;
  const ts =
    det.frameTimestampMs != null
      ? `${(det.frameTimestampMs / 1000).toFixed(1)}s`
      : '—';
  return (
    <View style={[styles.trayRow, !high && styles.trayRowFlagged]}>
      <View style={styles.trayMeta}>
        <View style={styles.trayTitleRow}>
          <Text style={styles.trayIndex}>#{det.sequence}</Text>
          <Text style={styles.trayTitle} numberOfLines={1}>
            {det.colour}
            {det.modelLabel ? ` · ${shortLabel(det.modelLabel)}` : ''}
          </Text>
        </View>
        <Text style={styles.traySub}>
          First seen @ {ts}
          {!high ? ` · below ${Math.round(CONFIDENCE_THRESHOLD * 100)}%` : ''}
        </Text>
        {!high ? (
          <Text style={styles.flagHint}>
            Below {Math.round(VERIFY_THRESHOLD * 100)}% threshold — re-scan
          </Text>
        ) : null}
      </View>
      <View style={styles.trayRight}>
        <Text style={[styles.trayPct, !high && styles.trayPctFlagged]}>
          {(det.confidence * 100).toFixed(0)}%
        </Text>
        <View style={[styles.badge, high ? styles.badgeOk : styles.badgeFlagged]}>
          <Text style={[styles.badgeText, !high && styles.badgeTextFlagged]}>
            {high ? 'Verified' : 'Flagged'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function countByLabel(dets: StoredYoloDetection[]) {
  const map = new Map<string, number>();
  for (const d of dets) {
    map.set(d.label, (map.get(d.label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const paramExpected = parseInt(params.expectedCount as string, 10);
  const galleryId = typeof params.id === 'string' ? params.id : undefined;
  const fromGallery = Boolean(galleryId);

  const storeExpected = useScanStore((s) => s.expectedCount);
  const expectedCount =
    !Number.isNaN(paramExpected) && paramExpected > 0 ? paramExpected : storeExpected;
  const detections = useScanStore((s) => s.detections);
  const yoloDetections = useScanStore((s) => s.yoloDetections);
  const captureMedia = useScanStore((s) => s.captureMedia);
  const openGalleryItem = useScanStore((s) => s.openGalleryItem);
  const resetScan = useScanStore((s) => s.resetScan);
  const gallery = useScanStore((s) => s.gallery);
  const activeGalleryId = useScanStore((s) => s.activeGalleryId);
  const updateGalleryVideoReports = useScanStore((s) => s.updateGalleryVideoReports);
  const setYoloDetections = useScanStore((s) => s.setYoloDetections);

  useEffect(() => {
    if (galleryId) openGalleryItem(galleryId);
  }, [galleryId, openGalleryItem]);

  const videoFrameReports = useMemo(() => {
    const id = galleryId ?? activeGalleryId;
    if (!id) return [];
    return gallery.find((g) => g.id === id)?.videoFrameReports ?? [];
  }, [activeGalleryId, gallery, galleryId]);

  const yoloCount = yoloDetections.length;
  /** Prefer de-duped sweep labels (4.2) when the capture produced them. */
  const hasDistinctTrays =
    detections.length > 0 &&
    detections.some((d) => d.modelLabel != null || d.frameTimestampMs != null);
  const sourceCount = hasDistinctTrays
    ? detections.length
    : yoloCount > 0
      ? yoloCount
      : detections.length;
  const coverage =
    expectedCount > 0 ? Math.min(100, Math.round((sourceCount / expectedCount) * 100)) : 0;

  const flaggedYolo = yoloDetections.filter((d) => d.confidence < CONFIDENCE_THRESHOLD);
  const flaggedTrays = detections.filter((d) => d.confidence < CONFIDENCE_THRESHOLD);
  const flaggedCount = hasDistinctTrays
    ? flaggedTrays.length
    : yoloCount > 0
      ? flaggedYolo.length
      : flaggedTrays.length;
  const verifiedCount = Math.max(0, sourceCount - flaggedCount);
  const yoloCounts = useMemo(() => countByLabel(yoloDetections), [yoloDetections]);

  const listData: ListItem[] = hasDistinctTrays
    ? detections.map((det) => ({ kind: 'tray' as const, det }))
    : yoloCount > 0
      ? yoloDetections.map((det, index) => ({ kind: 'yolo' as const, det, index }))
      : detections.map((det) => ({ kind: 'tray' as const, det }));

  const handleRescanFlagged = () => {
    const flagged = hasDistinctTrays
      ? flaggedTrays
      : yoloCount > 0
        ? flaggedYolo
        : flaggedTrays;
    const indices = hasDistinctTrays
      ? flaggedTrays.map((d) => d.sequence).join(',')
      : yoloCount > 0
        ? flaggedYolo.map((_, i) => i + 1).join(',')
        : flaggedTrays.map((d) => d.sequence).join(',');
    const rescanExpected = Math.max(1, flagged.length);
    router.replace({
      pathname: '/camera',
      params: {
        expectedCount: String(rescanExpected),
        rescanIndices: indices,
      },
    });
  };

  const handleDone = () => {
    if (fromGallery) {
      router.back();
      return;
    }
    resetScan();
    router.replace('/home');
  };

  const mediaUri = captureMedia ? toMediaUri(captureMedia.path) : null;
  const sessionId = galleryId
    ? `#${galleryId.slice(-5).toUpperCase()}`
    : `#SCN-${String(expectedCount).padStart(5, '0')}`;

  const topFlagged = hasDistinctTrays
    ? flaggedTrays[0]
      ? {
          label: flaggedTrays[0].modelLabel ?? flaggedTrays[0].colour,
          confidence: flaggedTrays[0].confidence,
        }
      : null
    : yoloCount > 0 && flaggedYolo[0]
      ? { label: flaggedYolo[0].label, confidence: flaggedYolo[0].confidence }
      : flaggedTrays[0]
        ? {
            label: flaggedTrays[0].modelLabel ?? flaggedTrays[0].colour,
            confidence: flaggedTrays[0].confidence,
          }
        : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navBtn} onPress={handleDone}>
          <Text style={styles.navBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Manual Override Verification
        </Text>
        <TouchableOpacity style={styles.navAvatar} onPress={() => router.push('/gallery')}>
          <Text style={styles.navAvatarText}>▣</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, index) =>
          item.kind === 'yolo'
            ? `yolo-${item.det.classId}-${index}`
            : `tray-${item.det.sequence}`
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.sessionRow}>
              <View style={styles.sessionPill}>
                <Text style={styles.sessionPillMuted}>Session</Text>
                <Text style={styles.sessionPillId}>{sessionId}</Text>
              </View>
              <View style={styles.runPill}>
                <View style={styles.runDot} />
                <Text style={styles.runText}>
                  {sourceCount}/{expectedCount} DETECTED
                </Text>
              </View>
            </View>

            <View style={styles.reportCard}>
              <View style={styles.reportTop}>
                <Text style={styles.reportEyebrow}>SESSION REPORT</Text>
                <View style={styles.completeBadge}>
                  <Text style={styles.completeBadgeText}>
                    {flaggedCount === 0 && sourceCount >= expectedCount
                      ? 'Complete'
                      : 'Review'}
                  </Text>
                </View>
              </View>
              <View style={styles.reportMetrics}>
                <Text style={styles.reportBig}>
                  {sourceCount}{' '}
                  <Text style={styles.reportBigMuted}>/ {expectedCount}</Text>
                </Text>
                <Text style={styles.reportCoverage}>{coverage}% COVERAGE</Text>
              </View>
              <Text style={styles.reportSub}>
                {yoloCount > 0
                  ? yoloCounts.map((c) => `${c.count}× ${shortLabel(c.label)}`).join(' · ')
                  : 'Bay positions registered via optical HUD'}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressVerified,
                    {
                      flex: Math.max(verifiedCount, 0.01),
                    },
                  ]}
                />
                {flaggedCount > 0 ? (
                  <View style={[styles.progressFlagged, { flex: flaggedCount }]} />
                ) : null}
                {expectedCount > sourceCount ? (
                  <View
                    style={[
                      styles.progressEmpty,
                      { flex: expectedCount - sourceCount },
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.legendRow}>
                <Text style={styles.legend}>
                  <Text style={styles.legendDotOk}>● </Text>
                  {verifiedCount} Verified (≥{Math.round(VERIFY_THRESHOLD * 100)}%)
                </Text>
                <Text style={styles.legend}>
                  <Text style={styles.legendDotWarn}>● </Text>
                  {flaggedCount} Flagged
                </Text>
              </View>
            </View>

            {flaggedCount > 0 && topFlagged ? (
              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>
                  {flaggedCount} Label{flaggedCount === 1 ? '' : 's'} Needs Review
                </Text>
                <Text style={styles.alertBody}>
                  {shortLabel(topFlagged.label)} registered confidence at{' '}
                  {(topFlagged.confidence * 100).toFixed(0)}%, falling below the mandatory{' '}
                  {Math.round(VERIFY_THRESHOLD * 100)}% verification threshold.
                </Text>
              </View>
            ) : flaggedCount > 0 ? (
              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>
                  {flaggedCount} Label{flaggedCount === 1 ? '' : 's'} Needs Review
                </Text>
                <Text style={styles.alertBody}>
                  Confidence below {Math.round(VERIFY_THRESHOLD * 100)}% verification threshold.
                </Text>
              </View>
            ) : null}

            {captureMedia?.kind === 'photo' && mediaUri ? (
              <View style={styles.mediaCard}>
                <Text style={styles.sectionTitle}>{describeCapture(captureMedia)}</Text>
                <Image
                  source={{ uri: mediaUri }}
                  style={styles.mediaPreview}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            ) : null}

            {captureMedia?.kind === 'video' && mediaUri ? (
              <View style={styles.mediaCard}>
                <Text style={styles.sectionTitle}>
                  {describeCapture(captureMedia)} · {videoFrameReports.length} frame samples
                </Text>
                <CaptureVideoPlayer
                  uri={mediaUri}
                  style={styles.videoPreview}
                  onScanComplete={(reports, lastDets) => {
                    setYoloDetections(lastDets);
                    const id = galleryId ?? activeGalleryId;
                    if (id) {
                      void updateGalleryVideoReports(id, reports, lastDets);
                    }
                  }}
                />
              </View>
            ) : null}

            {videoFrameReports.length > 0 ? (
              <View style={styles.frameReportCard}>
                <Text style={styles.sectionTitle}>Frame-wise detection report</Text>
                <Text style={styles.frameReportHint}>
                  Sampled ~every 500ms while REC was on. Open a row to see label counts for that
                  moment.
                </Text>
                {videoFrameReports.map((fr) => {
                  const counts = countByLabel(fr.detections);
                  return (
                    <View key={`fr-${fr.frameIndex}`} style={styles.frameRow}>
                      <AppIcon name="filmstrip" size={16} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.frameRowTitle}>
                          Frame #{fr.frameIndex + 1} · {(fr.atMs / 1000).toFixed(1)}s
                        </Text>
                        <Text style={styles.frameRowSub}>
                          {fr.detections.length === 0
                            ? 'No boxes'
                            : counts
                                .map((c) => `${c.count}× ${shortLabel(c.label)}`)
                                .join(' · ')}
                        </Text>
                      </View>
                      <Text style={styles.frameCount}>{fr.detections.length}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Detected Trays</Text>
              <Text style={styles.sectionMeta}>
                Ordered 01 – {String(Math.max(expectedCount, sourceCount)).padStart(2, '0')}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'yolo' ? (
            <YoloTrayRow
              det={item.det}
              index={item.index}
              flagged={item.det.confidence < CONFIDENCE_THRESHOLD}
            />
          ) : (
            <DistinctTrayRow det={item.det} />
          )
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No distinct labels yet. Start a video sweep and pan across the rack.
          </Text>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {flaggedCount > 0 && !fromGallery ? (
              <TouchableOpacity style={styles.rescanBtn} onPress={handleRescanFlagged}>
                <Text style={styles.rescanBtnText}>
                  RE-SCAN FLAGGED ({flaggedCount})
                  {topFlagged ? ` · ${shortLabel(topFlagged.label)}` : ''}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>
                {fromGallery
                  ? 'Back to Gallery'
                  : flaggedCount > 0
                    ? 'Accept All as-is (Manual Override)'
                    : 'NEW SCAN'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  navBtnText: {
    color: colors.onSurface,
    fontSize: 22,
  },
  navTitle: {
    flex: 1,
    fontFamily: fonts.sansMd,
    fontSize: 16,
    color: colors.onSurface,
  },
  navAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navAvatarText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  headerBlock: {
    gap: 12,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionPillMuted: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  sessionPillId: {
    fontFamily: fonts.monoSemi,
    fontSize: 13,
    color: colors.primary,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  runPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  runDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  runText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurface,
  },
  reportCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  reportTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportEyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  completeBadge: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completeBadgeText: {
    fontFamily: fonts.monoSemi,
    fontSize: 11,
    color: colors.primary,
  },
  reportMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  reportBig: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: colors.onSurface,
  },
  reportBigMuted: {
    fontFamily: fonts.sans,
    fontSize: 18,
    color: colors.onSurfaceVariant,
  },
  reportCoverage: {
    fontFamily: fonts.monoSemi,
    fontSize: 14,
    color: colors.primary,
  },
  reportSub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
    padding: 2,
  },
  progressVerified: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  progressFlagged: {
    backgroundColor: colors.tertiary,
  },
  progressEmpty: {
    backgroundColor: colors.border,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  legend: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  legendDotOk: { color: colors.primary },
  legendDotWarn: { color: colors.tertiary },
  alertCard: {
    backgroundColor: 'rgba(226, 145, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  alertTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.tertiary,
  },
  alertBody: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurface,
  },
  mediaCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  mediaPreview: {
    width: '100%',
    height: 360,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
  },
  videoPreview: {
    width: '100%',
    height: 400,
    borderRadius: 8,
  },
  frameReportCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  frameReportHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#C8CDD6',
    lineHeight: 18,
  },
  frameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  frameRowTitle: {
    fontFamily: fonts.sansMd,
    fontSize: 13,
    color: colors.white,
  },
  frameRowSub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#C8CDD6',
    marginTop: 2,
  },
  frameCount: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.primary,
    minWidth: 28,
    textAlign: 'right',
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.white,
  },
  sectionMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trayRow: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  trayRowFlagged: {
    borderColor: colors.tertiary,
    backgroundColor: 'rgba(226, 145, 0, 0.08)',
  },
  trayStrip: {
    width: 6,
    height: 40,
    borderRadius: 999,
  },
  trayMeta: {
    flex: 1,
    minWidth: 0,
  },
  trayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trayIndex: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  trayTitle: {
    fontFamily: fonts.sansMd,
    fontSize: 14,
    color: colors.onSurface,
    flexShrink: 1,
  },
  traySub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  flagHint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.tertiary,
    marginTop: 4,
  },
  trayRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trayPct: {
    fontFamily: fonts.monoBold,
    fontSize: 18,
    color: colors.primary,
  },
  trayPctFlagged: {
    color: colors.tertiary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeOk: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
  },
  badgeFlagged: {
    backgroundColor: 'rgba(226, 145, 0, 0.18)',
  },
  badgeText: {
    fontFamily: fonts.monoSemi,
    fontSize: 11,
    color: colors.primary,
  },
  badgeTextFlagged: {
    color: colors.tertiary,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 24,
  },
  footer: {
    marginTop: 16,
    gap: 10,
    paddingBottom: 16,
  },
  rescanBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.warningAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescanBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.white,
    letterSpacing: 0.4,
  },
  doneBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontFamily: fonts.sansMd,
    fontSize: 14,
    color: colors.onSurface,
  },
});
