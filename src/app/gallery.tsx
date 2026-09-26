import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppModel } from '../ml/ModelProvider';
import { useScanStore } from '../store/scanStore';
import type { GalleryItem, StoredClassification } from '../types';
import { MAX_GALLERY_ITEMS } from '../types';
import { formatBytes, sumGalleryBytes } from '../utils/galleryStorage';
import { colors, fonts } from '../theme/scanner';
import { describeCapture, toMediaUri } from '../utils/scanHelpers';

const YOLO_CONF_THRESH = 0.45;

function GalleryCard({
  item,
  width,
  onOpen,
  onDelete,
}: {
  item: GalleryItem;
  width: number;
  onOpen: (item: GalleryItem) => void;
  onDelete: (item: GalleryItem) => void;
}) {
  const uri = toMediaUri(item.media.path);
  const when = new Date(item.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const cls = item.classification;
  const yoloCount = item.yoloDetections?.length ?? 0;

  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      onPress={() => onOpen(item)}
      onLongPress={() => onDelete(item)}
      activeOpacity={0.85}
    >
      {item.media.kind === 'photo' ? (
        <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.videoThumb]}>
          <Text style={styles.videoBadge}>VIDEO</Text>
        </View>
      )}
      <View style={styles.cardMeta}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {cls
            ? `${cls.locked ? '🔒 ' : ''}${cls.label} ${(cls.score * 100).toFixed(0)}%`
            : describeCapture(item.media)}
        </Text>
        <Text style={styles.cardSub}>
          {yoloCount > 0
            ? `${yoloCount} YOLO box${yoloCount === 1 ? '' : 'es'}`
            : cls
              ? 'Detected'
              : 'Not detected'}{' '}
          · {when}
        </Text>
        {item.media.byteSize != null ? (
          <Text style={styles.cardSize}>{formatBytes(item.media.byteSize)}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function GalleryScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { detectImageUri, state: modelState, isLoaded } = useAppModel();
  const gallery = useScanStore((s) => s.gallery);
  const openGalleryItem = useScanStore((s) => s.openGalleryItem);
  const removeGalleryItem = useScanStore((s) => s.removeGalleryItem);
  const clearGallery = useScanStore((s) => s.clearGallery);
  const updateGalleryClassification = useScanStore((s) => s.updateGalleryClassification);
  const logPrediction = useScanStore((s) => s.logPrediction);
  const predictionLog = useScanStore((s) => s.predictionLog);
  const [busy, setBusy] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState<string | null>(null);

  const gap = 12;
  const pad = 16;
  const columns = windowWidth >= 700 ? 3 : 2;
  const cardWidth = (windowWidth - pad * 2 - gap * (columns - 1)) / columns;
  const bytesUsed = useMemo(() => sumGalleryBytes(gallery), [gallery]);
  const photoCount = useMemo(
    () => gallery.filter((g) => g.media.kind === 'photo').length,
    [gallery],
  );

  const handleOpen = useCallback(
    (item: GalleryItem) => {
      const ok = openGalleryItem(item.id);
      if (!ok) {
        Alert.alert('Missing capture', 'This item could not be loaded.');
        return;
      }
      router.push({
        pathname: '/summary',
        params: { id: item.id, expectedCount: String(item.expectedCount) },
      });
    },
    [openGalleryItem, router],
  );

  const handleDelete = useCallback(
    (item: GalleryItem) => {
      Alert.alert('Delete capture?', 'Removes the saved media and its audit data from this device.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            void removeGalleryItem(item.id).finally(() => setBusy(false));
          },
        },
      ]);
    },
    [removeGalleryItem],
  );

  const handleClassifyAll = useCallback(async () => {
    if (!isLoaded || modelState !== 'loaded') {
      Alert.alert('Model not ready', 'Wait for YOLOv8n to finish loading.');
      return;
    }
    const photos = gallery.filter((g) => g.media.kind === 'photo');
    if (photos.length === 0) {
      Alert.alert('No photos', 'SNAP some photos first. Videos are skipped for this demo.');
      return;
    }

    setBusy(true);
    let done = 0;
    let withDets = 0;
    try {
      for (const item of photos) {
        done += 1;
        setClassifyProgress(`Detecting ${done}/${photos.length}…`);
        const dets = await detectImageUri(toMediaUri(item.media.path));
        const top = dets[0];
        if (top == null) continue;

        withDets += 1;
        const locked = top.confidence >= YOLO_CONF_THRESH;
        const stored: StoredClassification = {
          index: top.classId,
          label: `${top.label}${dets.length > 1 ? ` (+${dets.length - 1})` : ''}`,
          score: top.confidence,
          locked,
          classifiedAt: Date.now(),
        };
        await updateGalleryClassification(item.id, stored);
        logPrediction(
          {
            index: top.classId,
            label: top.label,
            score: top.confidence,
            box: { x: top.x, y: top.y, width: top.width, height: top.height },
            locked,
          },
          'gallery',
          locked,
          item.id,
        );
      }
      Alert.alert(
        'Gallery detected',
        `Ran native YOLOv8n on ${photos.length} photo(s). ${withDets} had ≥1 detection.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Detection failed.';
      Alert.alert('Detect error', message);
    } finally {
      setClassifyProgress(null);
      setBusy(false);
    }
  }, [
    detectImageUri,
    gallery,
    isLoaded,
    logPrediction,
    modelState,
    updateGalleryClassification,
  ]);

  const handleClearAll = () => {
    if (gallery.length === 0) return;
    Alert.alert(
      'Clear gallery?',
      `Deletes all ${gallery.length} saved captures (${formatBytes(bytesUsed)}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            void clearGallery().finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Gallery</Text>
          <Text style={styles.subtitle}>
            {gallery.length}/{MAX_GALLERY_ITEMS} · {formatBytes(bytesUsed)} · log {predictionLog.length}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.clearBtn, (gallery.length === 0 || busy) && styles.clearBtnDisabled]}
          onPress={handleClearAll}
          disabled={gallery.length === 0 || busy}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.classifyBtn, (busy || photoCount === 0) && styles.clearBtnDisabled]}
          onPress={() => void handleClassifyAll()}
          disabled={busy || photoCount === 0}
        >
          {busy && classifyProgress ? (
            <ActivityIndicator color="#07110d" size="small" />
          ) : null}
          <Text style={styles.classifyBtnText}>
            {classifyProgress ?? `Detect photos (${photoCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={gallery}
        key={columns}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={columns > 1 ? { gap } : undefined}
        contentContainerStyle={[styles.list, gallery.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={() => <View style={{ height: gap }} />}
        renderItem={({ item }) => (
          <GalleryCard
            item={item}
            width={cardWidth}
            onOpen={handleOpen}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No captures yet</Text>
            <Text style={styles.emptyBody}>
              SNAP photos on the camera screen. Then run YOLOv8n here — top detection is stored
              per photo.
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    color: colors.onSurface,
    fontFamily: fonts.sansMd,
    fontSize: 13,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 22,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
    marginTop: 2,
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  clearBtnDisabled: {
    opacity: 0.4,
  },
  clearBtnText: {
    color: colors.tertiary,
    fontFamily: fonts.sansMd,
    fontSize: 13,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  classifyBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
  },
  classifyBtnText: {
    color: colors.white,
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.elevated,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surfaceContainerLowest,
  },
  videoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    color: colors.white,
    fontFamily: fonts.monoBold,
    letterSpacing: 1,
    fontSize: 14,
  },
  cardMeta: {
    padding: 10,
    gap: 2,
  },
  cardTitle: {
    color: colors.onSurface,
    fontFamily: fonts.sansMd,
    fontSize: 13,
  },
  cardSub: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  cardSize: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 18,
  },
  emptyBody: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sans,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
