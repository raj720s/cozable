import { router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScanStore } from '../store/scanStore';
import { colors, fonts, ROTATION_DAYS } from '../theme/scanner';
import { formatBytes, sumGalleryBytes } from '../utils/galleryStorage';

export default function Index() {
  const [error, setError] = useState<string | null>(null);
  const [expectedCount, setExpectedCountInput] = useState(9);
  const setExpectedCount = useScanStore((s) => s.setExpectedCount);
  const gallery = useScanStore((s) => s.gallery);
  const bytesUsed = sumGalleryBytes(gallery);

  const bump = (delta: number) => {
    setError(null);
    setExpectedCountInput((n) => Math.max(1, Math.min(99, n + delta)));
  };

  const handleStart = () => {
    if (expectedCount < 1 || expectedCount > 99) {
      setError('Enter a number between 1 and 99');
      return;
    }
    setExpectedCount(expectedCount);
    router.push({
      pathname: '/camera',
      params: { expectedCount: String(expectedCount) },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <View style={[styles.logoDot, { backgroundColor: '#2563EB' }]} />
              <View style={[styles.logoDot, { backgroundColor: '#EAB308' }]} />
              <View style={[styles.logoDot, { backgroundColor: '#DC2626' }]} />
              <View style={[styles.logoDot, { backgroundColor: '#16A34A' }]} />
            </View>
            <View>
              <Text style={styles.brandTitle}>DAY COLOUR SCANNER</Text>
              <Text style={styles.brandSub}>INDUSTRIAL OPTICAL VISION v2.4</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/gallery')}
            accessibilityLabel="Open gallery / diagnostics"
          >
            <Text style={styles.iconBtnGlyph}>⚙</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hero}>
          Scan tray labels quickly using your phone camera with real-time neural edge
          detection.
        </Text>

        {gallery.length > 0 ? (
          <Text style={styles.galleryHint}>
            {gallery.length} saved · {formatBytes(bytesUsed)}
          </Text>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardLabel}>EXPECTED TRAY COUNT</Text>
            <Text style={styles.cardMeta}>BAY RACK</Text>
          </View>

          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => bump(-1)}
              accessibilityLabel="Decrease tray count"
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepValue}>
              <Text style={styles.stepCount}>{expectedCount}</Text>
              <Text style={styles.stepCaption}>Trays In Batch</Text>
            </View>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => bump(1)}
              accessibilityLabel="Increase tray count"
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardLabel}>ROTATION DAY REFERENCE</Text>
            <Text style={styles.cardMeta}>HACCP 7-DAY</Text>
          </View>
          {ROTATION_DAYS.map((row) => (
            <View key={row.day} style={styles.dayRow}>
              <View style={styles.dayLeft}>
                <View style={[styles.dayDot, { backgroundColor: row.hex }]} />
                <Text style={styles.dayCode}>{row.day}</Text>
                <Text style={styles.dayName}>{row.colour}</Text>
              </View>
              <Text style={styles.dayHex}>{row.hex}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleStart} activeOpacity={0.9}>
          <Text style={styles.primaryBtnText}>START SCAN</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    gap: 3,
    alignContent: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  brandTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.onSurface,
    letterSpacing: 0.4,
  },
  brandSub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGlyph: {
    fontSize: 22,
    color: colors.onSurfaceVariant,
  },
  hero: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  galleryHint: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontFamily: fonts.monoSemi,
    fontSize: 12,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  cardMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 8,
  },
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: colors.onSurface,
    lineHeight: 32,
  },
  stepValue: {
    alignItems: 'center',
    minWidth: 100,
  },
  stepCount: {
    fontFamily: fonts.monoBold,
    fontSize: 44,
    color: colors.primary,
    lineHeight: 48,
  },
  stepCaption: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  errorText: {
    fontFamily: fonts.sansMd,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
  dayRow: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dayCode: {
    fontFamily: fonts.monoSemi,
    fontSize: 13,
    color: colors.onSurface,
    width: 36,
  },
  dayName: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  dayHex: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 0.6,
  },
});
