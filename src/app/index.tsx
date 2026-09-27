import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, images } from '../theme/scanner';

const INTRO_MS = 1900;
const COPY_DELAY_MS = 700;
const LOGO_SPIN_MS = 1200;

/**
 * Animated brand intro (not the native OS splash).
 * Logo springs in while rotating -270° → 0°, then title / tagline / gradient bar;
 * after 1.9s replaces into Login.
 */
export default function IntroScreen() {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.35);
  const logoRotate = useSharedValue(-270);
  const copyOpacity = useSharedValue(0);
  const copyTranslateY = useSharedValue(16);
  const barOpacity = useSharedValue(0);
  const barScaleX = useSharedValue(0.15);

  useEffect(() => {
    logoOpacity.value = withSpring(1, { damping: 16, stiffness: 120 });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 100 });
    logoRotate.value = withTiming(0, {
      duration: LOGO_SPIN_MS,
      easing: Easing.out(Easing.cubic),
    });

    copyOpacity.value = withDelay(
      COPY_DELAY_MS,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    copyTranslateY.value = withDelay(
      COPY_DELAY_MS,
      withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    barOpacity.value = withDelay(
      COPY_DELAY_MS,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
    barScaleX.value = withDelay(
      COPY_DELAY_MS,
      withTiming(1, { duration: 640, easing: Easing.out(Easing.cubic) }),
    );

    const timer = setTimeout(() => {
      router.replace('/login');
    }, INTRO_MS);

    return () => clearTimeout(timer);
  }, [
    barOpacity,
    barScaleX,
    copyOpacity,
    copyTranslateY,
    logoOpacity,
    logoRotate,
    logoScale,
  ]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const copyStyle = useAnimatedStyle(() => ({
    opacity: copyOpacity.value,
    transform: [{ translateY: copyTranslateY.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
    transform: [{ scaleX: barScaleX.value }],
  }));

  return (
    <View style={styles.root}>
      <Animated.Image
        source={images.logo}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
        accessibilityLabel="ColorSweep logo"
      />

      <Animated.View style={[styles.copyBlock, copyStyle]}>
        <Text style={styles.title}>
          Color<Text style={styles.sweep}>Sweep</Text>
        </Text>
        <Text style={styles.tagline}>Day-colour HACCP label scanning</Text>
      </Animated.View>

      <Animated.Image
        source={images.gradient}
        style={[styles.gradientBar, barStyle]}
        resizeMode="stretch"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 128,
    height: 128,
    marginBottom: 28,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 34,
    color: colors.white,
    letterSpacing: -0.5,
  },
  sweep: {
    color: colors.primary,
  },
  tagline: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  gradientBar: {
    marginTop: 28,
    width: 160,
    height: 6,
    borderRadius: 3,
  },
});
