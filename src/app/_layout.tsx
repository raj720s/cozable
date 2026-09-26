import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInter,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
  useFonts as useMono,
} from '@expo-google-fonts/jetbrains-mono';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import { ModelProvider, useAppModel } from '../ml/ModelProvider';
import { useScanStore } from '../store/scanStore';
import { colors } from '../theme/scanner';

SplashScreen.preventAutoHideAsync().catch(() => {});

function BootstrapGate({ children }: { children: React.ReactNode }) {
  const {
    hasPermission: hasCameraPermission,
    requestPermission: requestCameraPermission,
    canRequestPermission: canRequestCamera,
  } = useCameraPermission();
  const {
    hasPermission: hasMicPermission,
    requestPermission: requestMicPermission,
    canRequestPermission: canRequestMic,
  } = useMicrophonePermission();
  const { isReady: modelReady, state: modelState, error: modelError } = useAppModel();
  const hydrateGallery = useScanStore((s) => s.hydrateGallery);

  const [permissionsSettled, setPermissionsSettled] = useState(false);
  const [gallerySettled, setGallerySettled] = useState(false);
  const didPrompt = useRef(false);

  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [monoLoaded] = useMono({
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });
  const fontsReady = interLoaded && monoLoaded;

  useEffect(() => {
    if (didPrompt.current) return;
    didPrompt.current = true;

    let cancelled = false;
    (async () => {
      try {
        if (!hasCameraPermission && canRequestCamera) {
          await requestCameraPermission();
        }
        if (!hasMicPermission && canRequestMic) {
          await requestMicPermission();
        }
      } catch (error) {
        console.warn('Permission bootstrap failed', error);
      } finally {
        if (!cancelled) setPermissionsSettled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await hydrateGallery();
      } catch (error) {
        console.warn('Gallery hydrate failed', error);
      } finally {
        if (!cancelled) setGallerySettled(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateGallery]);

  useEffect(() => {
    if (modelState === 'error' && modelError) {
      console.warn('TFLite model failed to load at startup', modelError);
    }
  }, [modelState, modelError]);

  const appReady =
    permissionsSettled && gallerySettled && modelReady && fontsReady;

  useEffect(() => {
    if (!appReady) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return <>{children}</>;
}

function RootNavigator() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="gallery" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ModelProvider>
        <BootstrapGate>
          <RootNavigator />
        </BootstrapGate>
      </ModelProvider>
    </SafeAreaProvider>
  );
}
