import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/scanner';

// ─── Animated success badge ───────────────────────────────────────────────────
function SuccessBadge() {
  const outerScale = useSharedValue(0);
  const innerScale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const ringRotation = useSharedValue(0);

  useEffect(() => {
    // Outer ring appears
    outerScale.value = withSpring(1, { damping: 14, stiffness: 120 });

    // Inner circle pops
    innerScale.value = withDelay(180, withSpring(1, { damping: 12, stiffness: 160 }));

    // Checkmark pops
    checkScale.value = withDelay(380, withSpring(1, { damping: 10, stiffness: 200 }));

    // Glow breathes
    glowOpacity.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );

    // Slow ring spin
    ringRotation.value = withDelay(
      400,
      withRepeat(withTiming(360, { duration: 10000, easing: Easing.linear }), -1, false),
    );
  }, [checkScale, glowOpacity, innerScale, outerScale, ringRotation]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }, { rotate: `${ringRotation.value}deg` }],
  }));
  const innerStyle = useAnimatedStyle(() => ({ transform: [{ scale: innerScale.value }] }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={badge.root}>
      {/* Outer glow */}
      <Animated.View style={[badge.glow, glowStyle]} />

      {/* Outer ring */}
      <Animated.View style={[badge.outerRing, outerStyle]}>
        {/* Dot indicators at cardinal points */}
        <View style={[badge.dot, { top: -4, left: '50%', marginLeft: -4 }]} />
        <View style={[badge.dot, { bottom: -4, left: '50%', marginLeft: -4 }]} />
        <View style={[badge.dot, { left: -4, top: '50%', marginTop: -4 }]} />
        {/* Green dot at top-right */}
        <View style={[badge.dot, badge.dotGreen, { top: 10, right: 10 }]} />
      </Animated.View>

      {/* Inner circle */}
      <Animated.View style={[badge.inner, innerStyle]}>
        {/* Checkmark */}
        <Animated.View style={[badge.checkWrap, checkStyle]}>
          <Text style={badge.check}>✓</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const badge = StyleSheet.create({
  root: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },
  outerRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: colors.surfaceContainerHigh,
    borderTopColor: colors.primary,
    borderRightColor: colors.surfaceContainerHigh,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
  },
  dotGreen: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  inner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 44,
    color: colors.primary,
    fontWeight: '700',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function InventoryUpdatedScreen() {
  const params = useLocalSearchParams<{ itemCount?: string; batchId?: string }>();
  const itemCount = parseInt(params.itemCount ?? '9', 10);
  const batchId = params.batchId ?? 'BCH-8824';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Success animation */}
        <View style={styles.badgeWrap}>
          <SuccessBadge />
        </View>

        {/* Transaction recorded label */}
        <View style={styles.txRow}>
          <View style={styles.txDot} />
          <Text style={styles.txLabel}>TRANSACTION RECORDED</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Inventory Updated</Text>
        <Text style={styles.subheading}>
          All {itemCount} items were successfully confirmed and added to inventory.
        </Text>

        {/* Reconciliation Manifest Card */}
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>⊡</Text>
              <Text style={styles.cardTitle}>RECONCILIATION MANIFEST</Text>
            </View>
            <View style={styles.syncedBadge}>
              <Text style={styles.syncedText}>SYNCED</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>STATUS</Text>
                <Text style={styles.statIcon}>⊙</Text>
              </View>
              <Text style={styles.statValue}>{itemCount}</Text>
              <Text style={styles.statSub}>Items Confirmed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>DATABASE</Text>
                <Text style={styles.statIcon}>▣</Text>
              </View>
              <Text style={styles.statValue}>{itemCount}</Text>
              <Text style={styles.statSub}>Items Updated</Text>
            </View>
          </View>

          {/* Audit row */}
          <View style={styles.auditRow}>
            <Text style={styles.auditIcon}>✦</Text>
            <Text style={styles.auditText}>
              Automated audit log created · Shelf-life &amp; Food-At-Risk recalculated
            </Text>
          </View>

          {/* Footer row */}
          <View style={styles.cardFooter}>
            <View style={styles.ingestRow}>
              <View style={styles.ingestDot} />
              <Text style={styles.ingestText}>OPTICAL INGEST ID #409-C</Text>
            </View>
            <Text style={styles.latencyText}>0.18s LATENCY</Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.replace('/inventory' as any)}
        >
          <Text style={styles.primaryBtnIcon}>▣</Text>
          <Text style={styles.primaryBtnText}>[ VIEW INVENTORY ]</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.8}
          onPress={() => router.replace('/home')}
        >
          <Text style={styles.secondaryBtnIcon}>⊞</Text>
          <Text style={styles.secondaryBtnText}>[ GO TO DASHBOARD ]</Text>
        </TouchableOpacity>

        {/* Footer note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            ⊙ Batch #{batchId} ledger synced with ERP
          </Text>
          <Text style={styles.footerNoteText}>⊙ ISO-22000 HACCP Verified</Text>
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  badgeWrap: {
    marginBottom: 28,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  txDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  txLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  heading: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  subheading: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  // ─── Card ──────────────────────────────
  card: {
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 14,
    color: colors.primary,
  },
  cardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  syncedBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncedText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    gap: 4,
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.8,
  },
  statIcon: {
    fontSize: 14,
    color: colors.primary,
  },
  statValue: {
    fontFamily: fonts.sansBold,
    fontSize: 32,
    color: colors.onSurface,
    lineHeight: 38,
  },
  statSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 10,
    padding: 12,
  },
  auditIcon: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  auditText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  ingestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ingestDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  ingestText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  latencyText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  // ─── Buttons ───────────────────────────
  primaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    backgroundColor: '#06B6D4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnIcon: {
    fontSize: 18,
    color: '#003824',
  },
  primaryBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#003824',
    letterSpacing: 1,
  },
  secondaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  secondaryBtnIcon: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  secondaryBtnText: {
    fontFamily: fonts.sansMd,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  // ─── Footer note ───────────────────────
  footerNote: {
    alignItems: 'center',
    gap: 4,
  },
  footerNoteText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
});
