import { router } from 'expo-router';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDayColourOps } from '../../hooks/useDayColourOps';
import { useScanStore } from '../../store/scanStore';
import { fonts } from '../../theme/scanner';

export default function HomeScreen() {
  const expectedCount = useScanStore((s) => s.expectedCount);
  const setExpectedCount = useScanStore((s) => s.setExpectedCount);
  const {
    today,
    week,
    atRisk,
    useFirst,
    totalUnits,
    atRiskUnits,
    latestScan,
  } = useDayColourOps();

  const bumpExpected = (delta: number) => {
    const next = Math.min(99, Math.max(1, expectedCount + delta));
    setExpectedCount(next);
  };

  const handleScanPress = () => {
    const count = expectedCount > 0 ? expectedCount : 9;
    setExpectedCount(count);
    router.push({
      pathname: '/camera',
      params: { expectedCount: String(count) },
    });
  };

  const riskPreview = atRisk.slice(0, 2);
  const soonPreview = useFirst.filter((s) => !s.isAtRisk).slice(0, 1);
  const listPreview = [...riskPreview, ...soonPreview].slice(0, 2);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={[styles.datePill, { backgroundColor: `${today.hex}26` }]}>
                <View style={[styles.dateDot, { backgroundColor: today.hex }]} />
                <Text style={[styles.dateText, { color: today.hex }]}>{today.pillText}</Text>
              </View>
              <Text style={styles.headerSubtitle}>Week {today.weekLabel}</Text>
            </View>
            <View style={styles.headerRow}>
              <Text style={styles.greeting}>{today.greeting}</Text>
              <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.bellIcon} onPress={() => router.push('/gallery')}>
                  <Text style={styles.bellText}>▣</Text>
                  {latestScan ? <View style={styles.bellBadge} /> : null}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.avatar, { backgroundColor: today.hex }]}>
                  <Text style={styles.avatarText}>{today.shortDay.slice(0, 2).toUpperCase()}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.weekStrip}>
            {week.map((d) => (
              <View
                key={d.shortDay}
                style={[
                  styles.weekCell,
                  d.isToday && styles.weekCellToday,
                  d.isPast && styles.weekCellPast,
                ]}
              >
                <View style={[styles.weekDot, { backgroundColor: d.hex }]} />
                <Text style={[styles.weekDay, d.isToday && styles.weekDayToday]}>{d.shortDay}</Text>
                <Text style={styles.weekColour} numberOfLines={1}>
                  {d.colour.slice(0, 3)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.gridRow}>
            <TouchableOpacity style={styles.gridItem} onPress={handleScanPress}>
              <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Text style={styles.gridIcon}>📷</Text>
              </View>
              <Text style={styles.gridText}>Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/inventory')}>
              <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Text style={styles.gridIcon}>📦</Text>
              </View>
              <Text style={styles.gridText}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/use-first')}>
              <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Text style={styles.gridIcon}>⚠️</Text>
              </View>
              <Text style={styles.gridText}>Use First</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/more')}>
              <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Text style={styles.gridIcon}>◎</Text>
              </View>
              <Text style={styles.gridText}>Rotation</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.expectCard}>
            <Text style={styles.expectLabel}>Expected trays this sweep</Text>
            <View style={styles.expectRow}>
              <TouchableOpacity style={styles.expectStep} onPress={() => bumpExpected(-1)}>
                <Text style={styles.expectStepText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.expectInput}
                keyboardType="number-pad"
                value={String(expectedCount)}
                onChangeText={(t) => {
                  const n = parseInt(t.replace(/\D/g, ''), 10);
                  if (!Number.isNaN(n)) setExpectedCount(Math.min(99, Math.max(1, n)));
                }}
                maxLength={2}
                selectTextOnFocus
              />
              <TouchableOpacity style={styles.expectStep} onPress={() => bumpExpected(1)}>
                <Text style={styles.expectStepText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.expectGo} onPress={handleScanPress}>
                <Text style={styles.expectGoText}>START SWEEP</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>THIS WEEK</Text>
                <View style={[styles.metricDot, { backgroundColor: today.hex }]} />
              </View>
              <Text style={styles.metricValue}>{totalUnits}</Text>
              <Text style={styles.metricSub}>labels scanned (Sun–Sat)</Text>
            </View>
            <View style={[styles.metricCard, styles.metricCardAlert]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricTitle, { color: '#EF4444' }]}>USE NOW</Text>
                <View style={[styles.metricDot, { backgroundColor: '#EF4444' }]} />
              </View>
              <Text style={[styles.metricValue, { color: '#FCA5A5' }]}>{atRiskUnits}</Text>
              <Text style={[styles.metricSub, { color: '#EF4444', fontWeight: 'bold' }]}>
                {today.colour} / expired colours
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>TODAY COLOUR</Text>
                <View style={[styles.metricDot, { backgroundColor: today.hex }]} />
              </View>
              <Text style={styles.metricValue}>{today.colour}</Text>
              <Text style={[styles.metricSub, { color: today.hex }]}>{today.weekday} delivery</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>QUEUE</Text>
                <View style={[styles.metricDot, { backgroundColor: '#F59E0B' }]} />
              </View>
              <Text style={styles.metricValue}>{useFirst.length}</Text>
              <Text style={styles.metricSub}>colours due ≤ tomorrow</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.sectionTitle}>Food At Risk</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/use-first')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listCard}>
            {listPreview.length === 0 ? (
              <Text style={styles.emptyHint}>
                No at-risk day-dots yet. Scan trays to fill this week rotation.
              </Text>
            ) : (
              listPreview.map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 ? <View style={styles.listDivider} /> : null}
                  <View style={styles.listItem}>
                    <View style={styles.listItemInfo}>
                      <View style={styles.itemTitleRow}>
                        <View style={[styles.itemDot, { backgroundColor: item.hex }]} />
                        <Text style={styles.itemTitle}>
                          {item.colour} · {item.weekday}
                        </Text>
                      </View>
                      <Text style={styles.itemSub}>
                        {item.units} labels ·{' '}
                        <Text style={{ color: item.isAtRisk ? '#EF4444' : '#F59E0B' }}>
                          {item.useBy}
                        </Text>
                      </Text>
                      <Text style={item.isAtRisk ? styles.itemPrice : styles.itemPriceYellow}>
                        {item.deliveryLabel}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={item.isAtRisk ? styles.actionBtnRed : styles.actionBtnOutline}
                      onPress={() => router.push('/use-first')}
                    >
                      <Text
                        style={
                          item.isAtRisk ? styles.actionBtnText : styles.actionBtnOutlineText
                        }
                      >
                        {item.isAtRisk ? 'USE NOW' : 'ALLOCATE'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.scanSummaryCard}>
            <View style={styles.scanSummaryHeader}>
              <View style={styles.scanSummaryIconWrap}>
                <Text style={styles.scanSummaryIcon}>📋</Text>
              </View>
              <View style={styles.scanSummaryInfo}>
                <Text style={styles.scanSummaryTitle}>Latest Scan</Text>
                <Text style={styles.scanSummarySub}>
                  {latestScan
                    ? `${latestScan.rackLabel} · ${latestScan.timeLabel}`
                    : 'No captures this session'}
                </Text>
              </View>
              {latestScan ? (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>
                    {latestScan.review === 0 ? 'Completed' : 'Review'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.scanStatsRow}>
              <View style={styles.scanStat}>
                <Text style={styles.scanStatLabel}>EXPECTED</Text>
                <Text style={styles.scanStatVal}>{latestScan?.expectedCount ?? '—'}</Text>
              </View>
              <View style={styles.scanStat}>
                <Text style={styles.scanStatLabel}>DETECTED</Text>
                <Text style={styles.scanStatVal}>{latestScan?.detected ?? 0}</Text>
              </View>
              <View style={styles.scanStat}>
                <Text style={[styles.scanStatLabel, { color: '#10B981' }]}>VERIFIED</Text>
                <Text style={[styles.scanStatVal, { color: '#10B981' }]}>
                  {latestScan?.verified ?? 0}
                </Text>
              </View>
              <View style={styles.scanStat}>
                <Text style={[styles.scanStatLabel, { color: '#F59E0B' }]}>REVIEW</Text>
                <Text style={[styles.scanStatVal, { color: '#F59E0B' }]}>
                  {latestScan?.review ?? 0}
                </Text>
              </View>
            </View>

            <View style={styles.accuracyRow}>
              <Text style={styles.accuracyLabel}>Verification Accuracy</Text>
              <Text style={styles.accuracyVal}>{latestScan?.accuracy ?? 0}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, latestScan?.accuracy ?? 0)}%` },
                ]}
              />
            </View>

            <TouchableOpacity
              style={styles.viewScanBtn}
              onPress={() => {
                if (latestScan) {
                  router.push({ pathname: '/summary', params: { id: latestScan.id } });
                } else {
                  handleScanPress();
                }
              }}
            >
              <Text style={styles.viewScanBtnText}>
                {latestScan ? 'VIEW SCAN' : 'START SCAN'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Make room for bottom nav
    gap: 16,
    paddingTop: 10,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  dateText: {
    fontFamily: fonts.sansMd,
    fontSize: 11,
    color: '#93C5FD',
  },
  headerSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#C8CDD6',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: '#FFFFFF',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161A23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellText: {
    fontSize: 16,
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#161A23',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expectCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#1B1F2A',
    borderWidth: 1,
    borderColor: '#2A3140',
    gap: 10,
  },
  expectLabel: {
    fontFamily: fonts.sansMd,
    fontSize: 13,
    color: '#9CA3AF',
  },
  expectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expectStep: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#252B38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expectStepText: {
    fontSize: 22,
    color: '#E5E7EB',
    fontFamily: fonts.sansBold,
  },
  expectInput: {
    width: 56,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0F131A',
    borderWidth: 1,
    borderColor: '#3B82F6',
    color: '#F9FAFB',
    fontFamily: fonts.monoBold,
    fontSize: 18,
    textAlign: 'center',
  },
  expectGo: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expectGoText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#042F1A',
    letterSpacing: 0.4,
  },
  gridItem: {
    alignItems: 'center',
    gap: 8,
    width: '23%',
    backgroundColor: '#161A23',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262A36',
  },
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIcon: {
    fontSize: 18,
  },
  gridText: {
    fontFamily: fonts.sansMd,
    fontSize: 11,
    color: '#E8EAED',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#161A23',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262A36',
  },
  metricCardAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: '#C8CDD6',
    letterSpacing: 1,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricValue: {
    fontFamily: fonts.sansBold,
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: '#C8CDD6',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  viewAllText: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: '#3B82F6',
  },
  emptyHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: '#C8CDD6',
    lineHeight: 20,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#161A23',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262A36',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    opacity: 0.85,
  },
  weekCellToday: {
    opacity: 1,
  },
  weekCellPast: {
    opacity: 0.45,
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  weekDay: {
    fontFamily: fonts.sansMd,
    fontSize: 10,
    color: '#C8CDD6',
  },
  weekDayToday: {
    color: '#FFFFFF',
  },
  weekColour: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: '#6B7280',
  },
  listCard: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262A36',
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemInfo: {
    gap: 4,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  itemSub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#C8CDD6',
  },
  itemPrice: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
  itemPriceYellow: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  actionBtnRed: {
    backgroundColor: '#EF4444', // Red button to match USE NOW
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnOutlineText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: '#F59E0B',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#262A36',
    marginVertical: 16,
  },
  scanSummaryCard: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262A36',
    padding: 16,
    gap: 16,
  },
  scanSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanSummaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scanSummaryIcon: {
    fontSize: 16,
  },
  scanSummaryInfo: {
    flex: 1,
  },
  scanSummaryTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  scanSummarySub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: '#C8CDD6',
  },
  completedBadge: {
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  completedBadgeText: {
    fontFamily: fonts.sansMd,
    fontSize: 10,
    color: '#10B981',
  },
  scanStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0A0D14',
    padding: 12,
    borderRadius: 12,
  },
  scanStat: {
    alignItems: 'center',
    gap: 4,
  },
  scanStatLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    color: '#C8CDD6',
    letterSpacing: 0.5,
  },
  scanStatVal: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  accuracyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accuracyLabel: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: '#E8EAED',
  },
  accuracyVal: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#10B981',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#262A36',
    borderRadius: 3,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  viewScanBtn: {
    borderWidth: 1,
    borderColor: '#262A36',
    backgroundColor: '#1F2430',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewScanBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#E8EAED',
    letterSpacing: 1,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#0A0D14', // Very dark to blend in
    borderTopWidth: 1,
    borderTopColor: '#161A23',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  navIconActive: {
    fontSize: 20,
  },
  navText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: '#C8CDD6',
  },
  navTextActive: {
    fontFamily: fonts.sansMd,
    fontSize: 10,
    color: '#06B6D4',
  },
  navCenter: {
    alignItems: 'center',
    position: 'relative',
    top: -24, // Lift the button up
    width: 70,
  },
  navCenterBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A0D14',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#F59E0B',
    borderTopColor: '#10B981',
    borderLeftColor: '#06B6D4',
    borderRightColor: '#F59E0B',
    marginBottom: 6,
  },
  navCenterInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161A23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenterIcon: {
    fontSize: 20,
  },
  navCenterText: {
    fontFamily: fonts.sansMd,
    fontSize: 10,
    color: '#06B6D4',
  },
});
