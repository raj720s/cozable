import { AppIcon } from '@/components/AppIcon';
import { useAppModel } from '@/ml/ModelProvider';
import { colors, fonts } from '@/theme/scanner';
import type { StoredYoloDetection, VideoFrameReport } from '@/types';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const LIVE_DETECT_MIN_MS = 550;
const FULL_SCAN_STEP_MS = 500;
const MAX_FULL_SCAN_FRAMES = 40;

type OverlayBox = StoredYoloDetection;

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  /** Persist / refresh parent when a full-video scan finishes. */
  onScanComplete?: (
    reports: VideoFrameReport[],
    lastDets: StoredYoloDetection[],
  ) => void;
};

/**
 * Video preview with optional live YOLO re-detection on the current frame
 * and a full-video re-scan that rebuilds frame reports.
 */
export function CaptureVideoPlayer({ uri, style, onScanComplete }: Props) {
  const { detectImageUri, isLoaded } = useAppModel();
  const [liveDetect, setLiveDetect] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<OverlayBox[]>([]);
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 });
  const [frameSize, setFrameSize] = useState({ w: 1, h: 1 });
  const busyRef = useRef(false);
  const lastDetectAtRef = useRef(0);
  const liveDetectRef = useRef(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.5;
  });

  useEffect(() => {
    liveDetectRef.current = liveDetect;
  }, [liveDetect]);

  const runDetectAtTime = useCallback(
    async (timeMs: number): Promise<StoredYoloDetection[]> => {
      const { uri: thumbUri, width, height } = await VideoThumbnails.getThumbnailAsync(uri, {
        time: Math.max(0, Math.floor(timeMs)),
        quality: 0.7,
      });
      if (width > 0 && height > 0) {
        setFrameSize({ w: width, h: height });
      }
      const dets = await detectImageUri(thumbUri);
      return dets.map((d) => ({
        x: d.x,
        y: d.y,
        width: d.width,
        height: d.height,
        classId: d.classId,
        confidence: d.confidence,
        label: d.label,
      }));
    },
    [detectImageUri, uri],
  );

  // Live detect while playing — sample thumbnail at currentTime + YOLO.
  useEffect(() => {
    if (!liveDetect || !isLoaded || scanning) return;

    const sub = player.addListener('timeUpdate', (payload) => {
      if (!liveDetectRef.current || busyRef.current) return;
      const now = Date.now();
      if (now - lastDetectAtRef.current < LIVE_DETECT_MIN_MS) return;
      lastDetectAtRef.current = now;
      busyRef.current = true;
      const timeMs = (payload.currentTime ?? player.currentTime) * 1000;
      void (async () => {
        try {
          const dets = await runDetectAtTime(timeMs);
          if (liveDetectRef.current) setBoxes(dets);
        } catch (e) {
          console.warn('[VideoDetect] live frame failed', e);
        } finally {
          busyRef.current = false;
        }
      })();
    });

    return () => {
      sub.remove();
    };
  }, [isLoaded, liveDetect, player, runDetectAtTime, scanning]);

  const handleToggleLive = () => {
    if (!isLoaded) return;
    setLiveDetect((v) => {
      const next = !v;
      if (!next) setBoxes([]);
      else if (!player.playing) player.play();
      return next;
    });
  };

  const handleFullScan = async () => {
    if (!isLoaded || scanning) return;
    setScanning(true);
    setLiveDetect(false);
    setBoxes([]);
    const wasPlaying = player.playing;
    try {
      player.pause();
      // Wait briefly for duration metadata
      let durationSec = player.duration;
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        await new Promise((r) => setTimeout(r, 400));
        durationSec = player.duration;
      }
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        durationSec = 5;
      }
      const durationMs = durationSec * 1000;
      const step = Math.max(
        FULL_SCAN_STEP_MS,
        Math.ceil(durationMs / MAX_FULL_SCAN_FRAMES),
      );
      const reports: VideoFrameReport[] = [];
      let lastDets: StoredYoloDetection[] = [];

      for (let t = 0, idx = 0; t <= durationMs && idx < MAX_FULL_SCAN_FRAMES; t += step, idx++) {
        setScanProgress(`Detecting ${idx + 1}…`);
        try {
          const dets = await runDetectAtTime(t);
          reports.push({ atMs: t, frameIndex: idx, detections: dets });
          if (dets.length > 0) lastDets = dets;
          setBoxes(dets);
        } catch (e) {
          console.warn('[VideoDetect] frame', idx, e);
          reports.push({ atMs: t, frameIndex: idx, detections: [] });
        }
      }

      onScanComplete?.(reports, lastDets);
      setScanProgress(`Done · ${reports.length} frames`);
    } catch (e) {
      console.warn('[VideoDetect] full scan failed', e);
      setScanProgress('Scan failed');
    } finally {
      setScanning(false);
      if (wasPlaying) player.play();
      setTimeout(() => setScanProgress(null), 2500);
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPreviewSize({ w: width, h: height });
  };

  const { w: PW, h: PH } = previewSize;
  const { w: FW, h: FH } = frameSize;
  const scale = PW > 0 && PH > 0 ? Math.min(PW / FW, PH / FH) : 1;
  const scaledW = FW * scale;
  const scaledH = FH * scale;
  const offsetX = (PW - scaledW) / 2;
  const offsetY = (PH - scaledH) / 2;

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.stage} onLayout={onLayout}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {boxes.map((d, i) => {
            const left = d.x * scaledW + offsetX;
            const top = d.y * scaledH + offsetY;
            const width = Math.max(d.width * scaledW, 40);
            const height = Math.max(d.height * scaledH, 24);
            return (
              <View
                key={`vb-${i}`}
                style={[
                  styles.box,
                  {
                    left,
                    top,
                    width,
                    height,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={styles.boxLabel} numberOfLines={1}>
                  {d.label} {(d.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            );
          })}
        </View>
        {scanning ? (
          <View style={styles.scanOverlay}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.scanOverlayText}>{scanProgress ?? 'Scanning…'}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, liveDetect && styles.toolBtnOn]}
          onPress={handleToggleLive}
          disabled={!isLoaded || scanning}
        >
          <AppIcon
            name={liveDetect ? 'eye' : 'eye-off'}
            size={18}
            color={liveDetect ? colors.onPrimary : colors.white}
          />
          <Text style={[styles.toolText, liveDetect && styles.toolTextOn]}>
            {liveDetect ? 'Live detect ON' : 'Live detect'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, styles.toolBtnPrimary]}
          onPress={() => void handleFullScan()}
          disabled={!isLoaded || scanning}
        >
          <AppIcon name="magnify-scan" size={18} color={colors.onPrimary} />
          <Text style={[styles.toolText, styles.toolTextOn]}>
            {scanning ? 'Scanning…' : 'Re-scan video'}
          </Text>
        </TouchableOpacity>
      </View>

      {scanProgress && !scanning ? (
        <Text style={styles.hint}>{scanProgress}</Text>
      ) : (
        <Text style={styles.hint}>
          {isLoaded
            ? 'Live detect runs YOLO on the current frame while playing. Re-scan walks the whole clip.'
            : 'Waiting for model…'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
    borderRadius: 12,
    gap: 8,
  },
  stage: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: 8,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  boxLabel: {
    position: 'absolute',
    top: -18,
    left: 0,
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    fontSize: 11,
    fontFamily: fonts.sansBold,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanOverlayText: {
    color: colors.white,
    fontFamily: fonts.sansMd,
    fontSize: 13,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolBtnOn: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  toolBtnPrimary: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  toolText: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: colors.white,
  },
  toolTextOn: {
    color: colors.onPrimary,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: '#C8CDD6',
    paddingHorizontal: 4,
    paddingBottom: 4,
    lineHeight: 16,
  },
});
