import { useAppModel, type YoloDetection } from '@/ml/ModelProvider';
import {
  EMPTY_PREDICTION,
  type ClassificationResult,
} from '@/ml/prediction';
import { useTensorDebug } from '@/ml/useTensorDebug';
import { useScanStore } from '@/store/scanStore';
import { CLASS_COLORS_BY_ID, colors, fonts } from '@/theme/scanner';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  CommonResolutions,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  useMicrophonePermission,
  usePhotoOutput,
  useVideoOutput,
  type CameraRef,
  type FlashMode,
  type Frame,
  type Photo,
  type Recorder,
  type TorchMode,
} from 'react-native-vision-camera';
import { createSynchronizable, scheduleOnRN } from 'react-native-worklets';

/** Cap live YOLO to ~10 Hz (VisionCamera v5 has no runAtTargetFps helper). */
const INFER_INTERVAL_MS = 100;

/** Inference-only frame size — preview stays full quality via Camera view. */
const INFER_RESOLUTION = { width: 320, height: 240 };

const EMPTY_DETECTIONS: YoloDetection[] = [];

const CLASS_COLORS = CLASS_COLORS_BY_ID;

function toFileUri(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path;
  return `file://${path}`;
}

function topDetectionAsPrediction(
  dets: YoloDetection[],
): ClassificationResult {
  const top = dets[0];
  if (top == null) return EMPTY_PREDICTION;
  return {
    index: top.classId,
    label: top.label,
    score: top.confidence,
    box: { x: top.x, y: top.y, width: top.width, height: top.height },
  };
}

type FramePixelPacket = {
  pixels: Uint8Array;
  width: number;
  height: number;
  stride: number;
  channels: number;
  isBgra: boolean;
};

function isBenignCameraError(error: Error): boolean {
  const message = error.message ?? '';
  return (
    message.includes('OperationCanceledException') ||
    message.includes('Cancelled due to another zoom') ||
    message.includes('Camera is not active') ||
    message.includes('No flash unit')
  );
}

function nextFlashMode(mode: FlashMode): FlashMode {
  if (mode === 'off') return 'on';
  if (mode === 'on') return 'auto';
  return 'off';
}

export default function CameraScreen() {
  // Temporary: confirm day-colour model shapes in Metro (AGENTS.md)
  useTensorDebug();

  const router = useRouter();
  const params = useLocalSearchParams();
  const expectedCountParam = parseInt(params.expectedCount as string, 10);
  const isFocused = useIsFocused();

  const setExpectedCount = useScanStore((s) => s.setExpectedCount);
  const expectedCount = useScanStore((s) => s.expectedCount);
  const completeCapture = useScanStore((s) => s.completeCapture);
  const startScan = useScanStore((s) => s.startScan);
  const stopScan = useScanStore((s) => s.stopScan);
  const logPrediction = useScanStore((s) => s.logPrediction);

  const {
    hasPermission: hasCameraPermission,
    requestPermission: requestCameraPermission,
    canRequestPermission: canRequestCamera,
    status: cameraPermissionStatus,
  } = useCameraPermission();
  const {
    hasPermission: hasMicPermission,
    requestPermission: requestMicPermission,
    canRequestPermission: canRequestMic,
  } = useMicrophonePermission();

  const { state: modelState, isLoaded, detectImageUri, detectRgb, annotateImageUri } =
    useAppModel();

  useEffect(() => {
    console.log('[CAM] mounted, model loaded:', isLoaded, 'state:', modelState);
  }, [isLoaded, modelState]);

  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [torchMode, setTorchMode] = useState<TorchMode>('off');
  const [scanMode, setScanMode] = useState<'horizontal' | 'vertical'>('vertical');
  const [isRecording, setIsRecording] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [zoomLabel, setZoomLabel] = useState('1.0');
  const [capturing, setCapturing] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [prediction, setPrediction] = useState<ClassificationResult>(EMPTY_PREDICTION);
  const [detections, setDetections] = useState<YoloDetection[]>(EMPTY_DETECTIONS);
  const predictionRef = useRef(prediction);
  const detectionsRef = useRef<YoloDetection[]>(EMPTY_DETECTIONS);
  // Live frame dimensions from the camera. Updated per inference (ref, not state,
  // to avoid re-render churn). Default matches INFER_RESOLUTION.
  const frameDimsRef = useRef({ w: INFER_RESOLUTION.width, h: INFER_RESOLUTION.height });
  /** Preview layout inside SafeAreaView (excludes status/home black bars). */
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const { width: windowW, height: windowH } = useWindowDimensions();
  const previewW = previewSize.width > 0 ? previewSize.width : windowW;
  const previewH = previewSize.height > 0 ? previewSize.height : windowH;

  useEffect(() => {
    console.log('[RENDER] overlay', detections.length, 'boxes');
    detections.slice(0, 3).forEach((d, i) => {
      console.log('[RENDER] box', i, d.label, d.confidence.toFixed(3), d);
    });
  }, [detections]);

  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput({
    qualityPrioritization: 'balanced',
    targetResolution: CommonResolutions.HD_4_3,
  });
  const videoOutput = useVideoOutput({ enableAudio: true });
  const cameraRef = useRef<CameraRef>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const frameCounter = useMemo(() => createSynchronizable(0), []);
  /** Worklet-safe busy flag — never call native isBusy from the frame thread. */
  const mlBusy = useMemo(() => createSynchronizable(false), []);
  /** Last inference timestamp (ms) for FPS throttle. */
  const lastInferAt = useMemo(() => createSynchronizable(0), []);

  const reportDetections = useCallback((dets: YoloDetection[]) => {
    const next = topDetectionAsPrediction(dets);
    predictionRef.current = next;
    detectionsRef.current = dets;
    setDetections(dets);
    setPrediction(next);
  }, []);

  const reportFrameCount = useCallback((count: number) => {
    setFrameCount(count);
    console.log('[FRAME] count', count);
  }, []);

  const runDetectRgbOnJS = useCallback(
    (packet: FramePixelPacket) => {
      if (!isLoaded) {
        mlBusy.setBlocking(false);
        return;
      }
      void (async () => {
        try {
          // Record actual frame dims for coordinate mapping
          frameDimsRef.current = { w: packet.width, h: packet.height };
          const dets = await detectRgb(
            packet.pixels,
            packet.width,
            packet.height,
            packet.stride,
            packet.channels,
            packet.isBgra,
          );
          console.log(
            '[LIVE] detectRgb →',
            dets.length,
            dets[0] ?? null,
            `${packet.width}x${packet.height}`,
          );
          console.log('[DETECT] count:', dets.length);
          dets.slice(0, 3).forEach((d) => console.log('[DETECT] box:', d));
          reportDetections(dets);
          const top = dets[0];
          if (top != null) {
            const prev = predictionRef.current;
            if (
              prev.index !== top.classId ||
              Math.abs(prev.score - top.confidence) >= 0.1
            ) {
              logPrediction(topDetectionAsPrediction(dets), 'live', false);
            }
          }
        } catch (error) {
          console.warn('Native YOLO frame detect failed', error);
        } finally {
          mlBusy.setBlocking(false);
        }
      })();
    },
    [detectRgb, isLoaded, logPrediction, mlBusy, reportDetections],
  );

  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      const next = frameCounter.getDirty() + 1;
      frameCounter.setBlocking(next);

      if (next % 30 === 0) {
        scheduleOnRN(reportFrameCount, next);
      }

      let packet: FramePixelPacket | null = null;
      const now = Date.now();
      const due = now - lastInferAt.getDirty() >= INFER_INTERVAL_MS;
      if (
        due &&
        !mlBusy.getDirty() &&
        frame.hasPixelBuffer &&
        frame.width > 0
      ) {
        const width = frame.width;
        const height = frame.height;
        const stride = Math.max(frame.bytesPerRow, width * 3);
        const format = String(frame.pixelFormat);
        const isBgra = format.includes('bgra');
        const channels = stride >= width * 4 ? 4 : 3;
        try {
          packet = {
            pixels: new Uint8Array(frame.getPixelBuffer()),
            width,
            height,
            stride,
            channels,
            isBgra,
          };
          lastInferAt.setBlocking(now);
        } catch (err) {
          console.warn('Frame pixel buffer read failed:', err);
        }
      }

      frame.dispose();

      if (packet != null) {
        mlBusy.setBlocking(true);
        scheduleOnRN(runDetectRgbOnJS, packet);
      }
    },
    [frameCounter, lastInferAt, mlBusy, reportFrameCount, runDetectRgbOnJS],
  );

  const frameOutput = useFrameOutput({
    // LiteRT converts YUV→RGB internally; deliver RGB from the camera pipeline.
    pixelFormat: 'rgb',
    // Decouple from preview: smaller buffers for ML only.
    targetResolution: INFER_RESOLUTION,
    enablePreviewSizedOutputBuffers: false,
    enablePhysicalBufferRotation: true,
    dropFramesWhileBusy: true,
    onFrame,
  });

  const outputs = useMemo(
    () => [photoOutput, videoOutput, frameOutput],
    [photoOutput, videoOutput, frameOutput],
  );

  const isActive =
    hasCameraPermission &&
    isFocused &&
    appActive &&
    Boolean(device) &&
    sessionError == null;

  useEffect(() => {
    if (!Number.isNaN(expectedCountParam) && expectedCountParam > 0) {
      setExpectedCount(expectedCountParam);
    }
    startScan();
    return () => stopScan();
  }, [expectedCountParam, setExpectedCount, startScan, stopScan]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      if (state !== 'active') {
        setCameraStarted(false);
        setTorchMode('off');
      }
    });
    return () => sub.remove();
  }, []);

  const openPermissionSettings = useCallback(() => {
    Alert.alert(
      'Permission required',
      cameraPermissionStatus === 'restricted'
        ? 'Camera access is restricted on this device.'
        : 'Enable Camera (and Microphone for recording) in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
  }, [cameraPermissionStatus]);

  const ensurePermissions = useCallback(async () => {
    setPermissionBusy(true);
    try {
      let cameraOk = hasCameraPermission;
      if (!cameraOk && canRequestCamera) {
        cameraOk = await requestCameraPermission();
      }
      if (!hasMicPermission && canRequestMic) {
        await requestMicPermission();
      }
      if (!cameraOk) {
        openPermissionSettings();
        return false;
      }
      return true;
    } finally {
      setPermissionBusy(false);
    }
  }, [
    canRequestCamera,
    canRequestMic,
    hasCameraPermission,
    hasMicPermission,
    openPermissionSettings,
    requestCameraPermission,
    requestMicPermission,
  ]);

  const handleSessionError = useCallback((error: Error) => {
    if (isBenignCameraError(error)) {
      console.warn('Ignored benign camera control error', error.message);
      return;
    }
    console.error('Camera session error', error);
    setCameraStarted(false);
    setSessionError(error.message || 'Unknown camera error');
  }, []);

  const applyZoom = useCallback(async (nextZoom: number) => {
    const controller = cameraRef.current?.controller;
    if (!controller) return;
    try {
      await controller.setZoom(nextZoom);
      setZoomLabel(nextZoom.toFixed(1));
    } catch (error) {
      if (error instanceof Error && isBenignCameraError(error)) return;
      console.warn('Zoom failed', error);
    }
  }, []);

  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
      if (!device || !cameraStarted) return;
      const controller = cameraRef.current?.controller;
      const current = controller?.zoom ?? 1;
      const minZoom = device.minZoom ?? 1;
      const maxZoom = Math.min(device.maxZoom ?? 8, 8);
      const step = 0.5;
      const next =
        direction === 'in'
          ? Math.min(current + step, maxZoom)
          : Math.max(current - step, minZoom);
      void applyZoom(next);
    },
    [applyZoom, cameraStarted, device],
  );

  const handleCapturePhoto = async () => {
    if (!hasCameraPermission) {
      await ensurePermissions();
      return;
    }
    if (!photoOutput || !isActive || !cameraStarted || capturing) {
      Alert.alert('Camera not ready', 'Wait for the preview, then try again.');
      return;
    }
    setCapturing(true);
    try {
      const photo: Photo = await photoOutput.capturePhoto({ flashMode }, {});
      const path = await photo.saveToTemporaryFileAsync();
      const width = photo.width;
      const height = photo.height;
      photo.dispose();

      const uri = toFileUri(path);
      // Fresh detect on the saved photo so boxes match the gallery image.
      let dets: YoloDetection[] = [];
      if (isLoaded) {
        try {
          dets = await detectImageUri(uri);
        } catch (error) {
          console.warn('SNAP detect failed — using live boxes', error);
          dets = detectionsRef.current;
        }
      } else {
        dets = detectionsRef.current;
      }

      let savePath = path;
      if (dets.length > 0) {
        try {
          const annotated = await annotateImageUri(uri, dets);
          savePath = annotated;
        } catch (error) {
          console.warn('Annotate SNAP failed — saving raw photo', error);
        }
      }

      const snapPrediction = topDetectionAsPrediction(dets);
      await completeCapture(
        {
          kind: 'photo',
          path: savePath,
          width,
          height,
          capturedAt: Date.now(),
        },
        expectedCount,
        snapPrediction.index >= 0 ? snapPrediction : null,
        dets.length > 0 ? dets : null,
      );

      router.replace({
        pathname: '/summary',
        params: { expectedCount: String(expectedCount) },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not capture photo.';
      Alert.alert('Capture Error', message);
    } finally {
      setCapturing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!hasCameraPermission) {
      await ensurePermissions();
      return;
    }
    if (!hasMicPermission) {
      if (canRequestMic) {
        const granted = await requestMicPermission();
        if (!granted) {
          openPermissionSettings();
          return;
        }
      } else {
        openPermissionSettings();
        return;
      }
    }
    if (!videoOutput || !isActive || !cameraStarted) {
      Alert.alert('Camera not ready', 'Wait for the preview, then try again.');
      return;
    }

    if (isRecording) {
      try {
        await recorderRef.current?.stopRecording();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not stop recording.';
        Alert.alert('Recording Error', message);
        setIsRecording(false);
        recorderRef.current = null;
      }
      return;
    }

    setIsRecording(true);
    try {
      const recorder = await videoOutput.createRecorder({});
      recorderRef.current = recorder;
      await recorder.startRecording(
        (filePath) => {
          setIsRecording(false);
          recorderRef.current = null;
          setTorchMode('off');
          void (async () => {
            // Video file itself is never run through YOLO — only attach last live boxes.
            const liveDets = detectionsRef.current;
            const snapPrediction = topDetectionAsPrediction(liveDets);
            await completeCapture(
              {
                kind: 'video',
                path: filePath,
                capturedAt: Date.now(),
              },
              expectedCount,
              snapPrediction.index >= 0 ? snapPrediction : null,
              liveDets.length > 0 ? liveDets : null,
            );
            router.replace({
              pathname: '/summary',
              params: { expectedCount: String(expectedCount) },
            });
          })();
        },
        (error: Error) => {
          setIsRecording(false);
          recorderRef.current = null;
          Alert.alert('Recording Failure', error.message);
        },
      );
    } catch (error) {
      setIsRecording(false);
      recorderRef.current = null;
      const message = error instanceof Error ? error.message : 'Could not start recording.';
      Alert.alert('Recording Error', message);
    }
  };

  const handleFinish = () => {
    stopScan();
    router.replace({
      pathname: '/summary',
      params: { expectedCount: String(expectedCount) },
    });
  };

  const toggleFlash = () => setFlashMode((prev) => nextFlashMode(prev));
  const toggleTorch = () => {
    if (!device?.hasTorch || cameraPosition === 'front') {
      Alert.alert('Torch unavailable', 'Torch is only available on the back camera.');
      return;
    }
    setTorchMode((prev) => (prev === 'off' ? 'on' : 'off'));
  };
  const toggleCameraPosition = () => {
    setCameraStarted(false);
    setSessionError(null);
    setTorchMode('off');
    setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  if (!hasCameraPermission) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Camera access required</Text>
        <Text style={styles.fallbackText}>
          Status: {cameraPermissionStatus}. Enable Camera to continue.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => void ensurePermissions()}
          disabled={permissionBusy}
        >
          <Text style={styles.permissionButtonText}>
            {canRequestCamera ? 'Allow Camera' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>No camera device</Text>
        <Text style={styles.fallbackText}>
          Could not find a {cameraPosition} camera. Try the other lens or check Settings.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={toggleCameraPosition}>
          <Text style={styles.permissionButtonText}>Try other lens</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sessionError) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Camera unavailable</Text>
        <Text style={styles.fallbackText}>{sessionError}</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            setSessionError(null);
            setCameraStarted(false);
          }}
        >
          <Text style={styles.permissionButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionButton} onPress={() => Linking.openSettings()}>
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const modelStatusLabel =
    modelState === 'loaded'
      ? 'YOLOv8n live frames'
      : modelState === 'error'
        ? 'Model failed'
        : 'Loading model…';

  const frameMetaLabel =
    frameCount > 0
      ? `Frame #${frameCount} · ${detections.length} box${detections.length === 1 ? '' : 'es'}`
      : 'Waiting for camera frames…';

  const predictionLabel =
    prediction.index >= 0
      ? `${prediction.label}  ${(prediction.score * 100).toFixed(0)}%`
      : 'Point camera at day-colour tray labels…';

  return (
    <View style={styles.container}>
      <View style={styles.safePreview}>
        <View
          style={styles.previewFrame}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setPreviewSize({ width, height });
          }}
        >
          <Camera
            resizeMode="cover"
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isActive}
            outputs={outputs}
            torchMode={torchMode}
            enableNativeZoomGesture
            onStarted={() => {
              frameCounter.setBlocking(0);
              setPrediction(EMPTY_PREDICTION);
              setDetections(EMPTY_DETECTIONS);
              setFrameCount(0);
              setCameraStarted(true);
              setSessionError(null);
              setZoomLabel((device.minZoom ?? 1).toFixed(1));
            }}
            onStopped={() => setCameraStarted(false)}
            onError={handleSessionError}
          />

          <View style={styles.overlayContainer} pointerEvents="box-none">
            {/* Top Grey Panel */}
            <View style={styles.topSection}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                  <Text style={styles.iconBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Label</Text>
                <TouchableOpacity style={styles.iconBtn}>
                  <Text style={styles.iconBtnText}>?</Text>
                </TouchableOpacity>
              </View>

              {/* Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, scanMode === 'horizontal' && styles.toggleBtnActive]} 
                  onPress={() => setScanMode('horizontal')}
                >
                  <Text style={scanMode === 'horizontal' ? styles.toggleBtnActiveText : styles.toggleBtnText}>Horizontal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, scanMode === 'vertical' && styles.toggleBtnActive]} 
                  onPress={() => setScanMode('vertical')}
                >
                  <Text style={scanMode === 'vertical' ? styles.toggleBtnActiveText : styles.toggleBtnText}>Vertical</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.helperText}>Place the label inside the box</Text>
            </View>

            {/* Reticle Wrapper to center it */}
            <View style={styles.reticleWrapper} pointerEvents="none">
              <View style={[styles.reticleContainer, scanMode === 'horizontal' ? styles.reticleHorizontal : styles.reticleVertical]}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                <View style={styles.laserLine} />
                
                {/* Corner tech text */}
                <Text style={styles.reticleTechTL}>AI_OCR::TRACKING</Text>
                <Text style={styles.reticleTechTR}>FPS: 60.0</Text>
                <Text style={styles.reticleTechBL}>ZOOM 1.0X</Text>
                <Text style={styles.reticleTechBR}>AUTO_EXPOSURE</Text>
              </View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomSection}>
              <TouchableOpacity style={styles.controlBtn} onPress={toggleTorch}>
                <Text style={[styles.controlIcon, torchMode === 'on' ? { color: '#F59E0B', borderColor: '#F59E0B' } : {}]}>⚡</Text>
                <Text style={styles.controlLabel}>TORCH</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.captureBtnWrap} 
                onPress={() => void handleCapturePhoto()} 
                onLongPress={() => void handleToggleRecording()}
                delayLongPress={300}
                disabled={capturing}
              >
                <View style={isRecording ? styles.captureBtnRingRec : styles.captureBtnRing}>
                  <View style={isRecording ? styles.captureBtnInnerRec : styles.captureBtnInner} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={() => router.push('/gallery')}>
                <Text style={styles.controlIcon}>🖼</Text>
                <Text style={styles.controlLabel}>GALLERY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  safePreview: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  previewFrame: {
    flex: 1,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 1000,
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    display: 'flex',
  },
  topSection: {
    backgroundColor: 'rgba(26, 28, 32, 0.95)',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161A23',
    padding: 24,
    gap: 12,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 15,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 999,
    padding: 4,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  toggleBtnActive: {
    backgroundColor: '#3B82F6',
  },
  toggleBtnText: {
    fontFamily: fonts.sansMd,
    fontSize: 13,
    color: '#9CA3AF',
  },
  toggleBtnActiveText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  helperText: {
    alignSelf: 'center',
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 16,
  },
  // Reticle
  reticleWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
  },
  reticleHorizontal: {
    width: '90%',
    aspectRatio: 16 / 10,
  },
  reticleVertical: {
    height: '65%',
    aspectRatio: 3 / 4,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
    borderRadius: 8,
  },
  cornerTL: {
    top: -4,
    left: -4,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderColor: '#3B82F6', // Blue
  },
  cornerTR: {
    top: -4,
    right: -4,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderColor: '#10B981', // Green
  },
  cornerBL: {
    bottom: -4,
    left: -4,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderColor: '#EF4444', // Red/Orange
  },
  cornerBR: {
    bottom: -4,
    right: -4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderColor: '#F59E0B', // Yellow/Orange
  },
  reticleTechTL: { position: 'absolute', top: 16, left: 16, fontFamily: fonts.mono, fontSize: 10, color: '#4B5563', letterSpacing: 1 },
  reticleTechTR: { position: 'absolute', top: 16, right: 16, fontFamily: fonts.mono, fontSize: 10, color: '#4B5563', letterSpacing: 1 },
  reticleTechBL: { position: 'absolute', bottom: 16, left: 16, fontFamily: fonts.mono, fontSize: 10, color: '#4B5563', letterSpacing: 1 },
  reticleTechBR: { position: 'absolute', bottom: 16, right: 16, fontFamily: fonts.mono, fontSize: 10, color: '#4B5563', letterSpacing: 1 },
  // Fake OCR Card
  dataCard: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: '#9CA3AF',
  },
  dataValue: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: '#111827',
  },
  freshPrepBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4E8354', // Dark green background for the badge
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  freshPrepText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  freshPrepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A7F3D0', // Light green dot
  },
  laserLine: {
    position: 'absolute',
    top: '50%',
    left: -20,
    right: -20,
    height: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  // Bottom Controls
  bottomSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 48,
    paddingTop: 16,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 8,
  },
  controlIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: '#374151',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 48,
    fontSize: 20,
    color: '#FFFFFF',
  },
  controlLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: '#D1D5DB',
    letterSpacing: 1,
  },
  captureBtnWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#06B6D4',
    borderTopColor: '#3B82F6',
    borderBottomColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  captureBtnRingRec: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInnerRec: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
});
