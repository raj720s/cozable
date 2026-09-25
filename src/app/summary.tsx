import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScanStore } from '../store/scanStore';
import { CONFIDENCE_THRESHOLD, DAY_COLOUR_HEX, type TrayDetection } from '../types';
import { describeCapture, isHighConfidence, toMediaUri } from '../utils/scanHelpers';

function TrayRow({ item }: { item: TrayDetection }) {
  const high = isHighConfidence(item.confidence);
  return (
    <View style={[styles.trayRow, high ? styles.trayRowHigh : styles.trayRowLow]}>
      <View style={[styles.colourDot, { backgroundColor: DAY_COLOUR_HEX[item.colour] }]} />
      <View style={styles.trayMeta}>
        <Text style={styles.trayTitle}>
          Tray #{item.sequence}: {item.colour}
        </Text>
        <Text style={styles.trayConfidence}>
          Confidence {item.confidence.toFixed(2)}
          {item.modelLabel ? ` · ${item.modelLabel}` : ''}
        </Text>
      </View>
      <Text style={high ? styles.badgeHigh : styles.badgeLow}>{high ? 'OK' : 'LOW'}</Text>
    </View>
  );
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
  const captureMedia = useScanStore((s) => s.captureMedia);
  const galleryCount = useScanStore((s) => s.gallery.length);
  const openGalleryItem = useScanStore((s) => s.openGalleryItem);
  const resetScan = useScanStore((s) => s.resetScan);

  useEffect(() => {
    if (galleryId) {
      openGalleryItem(galleryId);
    }
  }, [galleryId, openGalleryItem]);

  const detectedCount = detections.length;
  const missing = Math.max(0, expectedCount - detectedCount);
  const flagged = detections.filter((d) => d.confidence < CONFIDENCE_THRESHOLD);
  const isComplete = detectedCount >= expectedCount && flagged.length === 0;

  const handleRescanFlagged = () => {
    router.replace({
      pathname: '/camera',
      params: {
        expectedCount: String(expectedCount),
        rescanIndices: flagged.map((d) => d.sequence).join(','),
      },
    });
  };

  const handleDone = () => {
    if (fromGallery) {
      router.back();
      return;
    }
    resetScan();
    router.replace('/');
  };

  const mediaUri = captureMedia ? toMediaUri(captureMedia.path) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={handleDone}>
          <Text style={styles.topBarBtnText}>{fromGallery ? 'Back' : 'Close'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={() => router.push('/gallery')}
        >
          <Text style={styles.topBarBtnText}>
            Gallery{galleryCount > 0 ? ` (${galleryCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={detections}
        keyExtractor={(item) => String(item.sequence)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{isComplete ? 'Scan Complete' : 'Scan Incomplete'}</Text>
            <Text style={styles.coverage}>
              Detected {detectedCount} of {expectedCount} expected
            </Text>
            {missing > 0 ? (
              <Text style={styles.warning}>Missing {missing} label{missing === 1 ? '' : 's'}</Text>
            ) : null}
            {flagged.length > 0 ? (
              <Text style={styles.warning}>
                {flagged.length} low-confidence label{flagged.length === 1 ? '' : 's'} (below{' '}
                {CONFIDENCE_THRESHOLD.toFixed(1)})
              </Text>
            ) : null}

            <View style={styles.legendRow}>
              <Text style={styles.legendHigh}>High ≥ {CONFIDENCE_THRESHOLD.toFixed(1)}</Text>
              <Text style={styles.legendLow}>Low &lt; {CONFIDENCE_THRESHOLD.toFixed(1)}</Text>
            </View>

            <View style={styles.mediaCard}>
              <Text style={styles.mediaLabel}>{describeCapture(captureMedia)}</Text>
              {captureMedia?.kind === 'photo' && mediaUri ? (
                <Image
                  source={{ uri: mediaUri }}
                  style={styles.mediaPreview}
                  contentFit="cover"
                  transition={200}
                />
              ) : captureMedia?.kind === 'video' ? (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoPlaceholderTitle}>Video sweep captured</Text>
                  <Text style={styles.videoPath} numberOfLines={3}>
                    {captureMedia.path}
                  </Text>
                </View>
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoPlaceholderTitle}>No media yet</Text>
                  <Text style={styles.videoPath}>
                    Take a SNAP or REC on the camera screen to attach output here.
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Tray audit</Text>
          </View>
        }
        renderItem={({ item }) => <TrayRow item={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No tray detections yet. Capture a photo or video sweep to seed the audit list.
          </Text>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {flagged.length > 0 && !fromGallery ? (
              <TouchableOpacity style={styles.rescanBtn} onPress={handleRescanFlagged}>
                <Text style={styles.rescanBtnText}>
                  Re-scan Flagged Labels ({flagged.map((d) => `#${d.sequence}`).join(', ')})
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>{fromGallery ? 'Back to Gallery' : 'Done'}</Text>
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
    backgroundColor: '#07110d',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  topBarBtn: {
    backgroundColor: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  topBarBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
    gap: 10,
  },
  header: {
    marginBottom: 12,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  coverage: {
    color: '#D1D5DB',
    fontSize: 16,
  },
  warning: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendHigh: {
    color: '#42d77d',
    fontSize: 12,
    fontWeight: '700',
  },
  legendLow: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  mediaCard: {
    marginTop: 12,
    backgroundColor: '#0f1a15',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  mediaLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  mediaPreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#111827',
  },
  videoPlaceholder: {
    minHeight: 140,
    padding: 16,
    justifyContent: 'center',
    gap: 8,
  },
  videoPlaceholderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  videoPath: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  trayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  trayRowHigh: {
    backgroundColor: 'rgba(66, 215, 125, 0.12)',
    borderColor: 'rgba(66, 215, 125, 0.35)',
  },
  trayRowLow: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  colourDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  trayMeta: {
    flex: 1,
    gap: 2,
  },
  trayTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  trayConfidence: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  badgeHigh: {
    color: '#42d77d',
    fontWeight: '800',
    fontSize: 12,
  },
  badgeLow: {
    color: '#F59E0B',
    fontWeight: '800',
    fontSize: 12,
  },
  empty: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    gap: 12,
  },
  rescanBtn: {
    backgroundColor: '#1f2937',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rescanBtnText: {
    color: '#FDE68A',
    fontSize: 15,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#42d77d',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#07110d',
    fontSize: 16,
    fontWeight: '800',
  },
});
