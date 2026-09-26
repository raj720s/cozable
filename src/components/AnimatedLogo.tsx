import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedLogoProps {
  size?: number;
}

export function AnimatedLogo({ size = 120 }: AnimatedLogoProps) {
  // Outer ring — slow continuous spin
  const outerRotation = useSharedValue(0);
  // Inner ring — reverse slow spin
  const innerRotation = useSharedValue(0);
  // Core pulse — scale in/out
  const coreScale = useSharedValue(1);
  // Outer ring glow pulse — opacity
  const glowOpacity = useSharedValue(0.6);

  const ringSize = size;
  const innerRingSize = size * 0.5;
  const coreSize = size * 0.18;
  const dotSize = size * 0.12;
  const borderW = size * 0.085;
  const innerBorderW = size * 0.04;

  useEffect(() => {
    // Outer ring: slow clockwise rotation (12 seconds per turn)
    outerRotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false,
    );

    // Inner ring: slow counter-clockwise (8 seconds per turn)
    innerRotation.value = withRepeat(
      withTiming(-360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );

    // Core: breathing pulse scale
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // Outer glow: opacity pulse (offset from core)
    glowOpacity.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [coreScale, glowOpacity, innerRotation, outerRotation]);

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${outerRotation.value}deg` }],
  }));

  const innerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${innerRotation.value}deg` }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
    opacity: glowOpacity.value,
  }));

  // The orbiting white dot sits on the outer ring at 10-o'clock (top-left).
  // It is a child of the outer ring so it rotates with it.
  const dotOffset = ringSize / 2 - borderW / 2;

  return (
    <View style={[styles.root, { width: ringSize, height: ringSize }]}>
      {/* Outer glow shadow ring */}
      <Animated.View
        style={[
          styles.outerRing,
          outerRingStyle,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: borderW,
            // Multi-colour gradient simulated via different border sides
            borderTopColor: '#06B6D4',    // cyan at top
            borderRightColor: '#3B82F6',  // blue at right
            borderBottomColor: '#EF4444', // red at bottom-left
            borderLeftColor: '#10B981',   // green at left
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 16,
          },
        ]}
      >
        {/* Orbiting white dot — rides the ring */}
        <View
          style={[
            styles.orbitDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              // Position at 10-o'clock on the ring edge
              top: ringSize * 0.17 - dotSize / 2,
              left: ringSize * 0.12 - dotSize / 2,
            },
          ]}
        />
      </Animated.View>

      {/* Inner secondary ring — reverse spin */}
      <Animated.View
        style={[
          styles.innerRing,
          innerRingStyle,
          {
            width: innerRingSize,
            height: innerRingSize,
            borderRadius: innerRingSize / 2,
            borderWidth: innerBorderW,
            borderTopColor: '#F59E0B',    // amber at top
            borderRightColor: '#FFFFFF22',
            borderBottomColor: '#8B5CF6', // violet at bottom
            borderLeftColor: '#FFFFFF22',
          },
        ]}
      />

      {/* Core pulsing dot */}
      <Animated.View
        style={[
          styles.core,
          coreStyle,
          {
            width: coreSize * 1.8,
            height: coreSize * 1.8,
            borderRadius: (coreSize * 1.8) / 2,
            shadowColor: '#FFFFFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 10,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitDot: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 10,
  },
  innerRing: {
    position: 'absolute',
  },
  core: {
    backgroundColor: '#FFFFFF',
  },
});
