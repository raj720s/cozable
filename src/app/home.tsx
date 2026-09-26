import { router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/scanner';

export default function HomeScreen() {
  const handleScanPress = () => {
    router.push('/camera');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.datePill}>
                <View style={styles.dateDot} />
                <Text style={styles.dateText}>Monday · Blue</Text>
              </View>
              <Text style={styles.headerSubtitle}>Food Operations</Text>
            </View>
            <View style={styles.headerRow}>
              <Text style={styles.greeting}>Good Morning, Bikash</Text>
              <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.bellIcon}>
                  <Text style={styles.bellText}>🔔</Text>
                  <View style={styles.bellBadge} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.avatar}>
                  <Text style={styles.avatarText}>BK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.gridRow}>
            <TouchableOpacity style={styles.gridItem} onPress={handleScanPress}>
              <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Text style={styles.gridIcon}>📷</Text>
              </View>
              <Text style={styles.gridText}>Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridItem}>
              <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Text style={styles.gridIcon}>📦</Text>
              </View>
              <Text style={styles.gridText}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridItem}>
              <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Text style={styles.gridIcon}>⚠️</Text>
              </View>
              <Text style={styles.gridText}>Use First</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridItem}>
              <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Text style={styles.gridIcon}>🔄</Text>
              </View>
              <Text style={styles.gridText}>Log Waste</Text>
            </TouchableOpacity>
          </View>

          {/* Metrics Row 1 */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>INVENTORY</Text>
                <View style={[styles.metricDot, { backgroundColor: '#3B82F6' }]} />
              </View>
              <Text style={styles.metricValue}>2,840</Text>
              <Text style={styles.metricSub}>units in cool store</Text>
            </View>
            <View style={[styles.metricCard, styles.metricCardAlert]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricTitle, { color: '#EF4444' }]}>FOOD AT RISK</Text>
                <View style={[styles.metricDot, { backgroundColor: '#EF4444' }]} />
              </View>
              <Text style={[styles.metricValue, { color: '#FCA5A5' }]}>126</Text>
              <Text style={[styles.metricSub, { color: '#EF4444', fontWeight: 'bold' }]}>Action required</Text>
            </View>
          </View>

          {/* Metrics Row 2 */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>TODAY'S USAGE</Text>
                <View style={[styles.metricDot, { backgroundColor: '#10B981' }]} />
              </View>
              <Text style={styles.metricValue}>1,842</Text>
              <Text style={[styles.metricSub, { color: '#10B981' }]}>↑ 12% vs planned</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>WASTE</Text>
                <View style={[styles.metricDot, { backgroundColor: '#6B7280' }]} />
              </View>
              <Text style={styles.metricValue}>34</Text>
              <Text style={[styles.metricSub, { color: '#10B981' }]}>-62% under limit</Text>
            </View>
          </View>

          {/* Section: Food At Risk */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.sectionTitle}>Food At Risk</Text>
            </View>
            <TouchableOpacity><Text style={styles.viewAllText}>View All →</Text></TouchableOpacity>
          </View>

          <View style={styles.listCard}>
            <View style={styles.listItem}>
              <View style={styles.listItemInfo}>
                <View style={styles.itemTitleRow}>
                  <View style={[styles.itemDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.itemTitle}>Chicken Sandwich</Text>
                </View>
                <Text style={styles.itemSub}>24 units · <Text style={{ color: '#EF4444' }}>Expires Today</Text></Text>
                <Text style={styles.itemPrice}>₹2,400 at risk</Text>
              </View>
              <TouchableOpacity style={styles.actionBtnRed}>
                <Text style={styles.actionBtnText}>USE NOW</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.listDivider} />

            <View style={styles.listItem}>
              <View style={styles.listItemInfo}>
                <View style={styles.itemTitleRow}>
                  <View style={[styles.itemDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.itemTitle}>Vegetable Wrap</Text>
                </View>
                <Text style={styles.itemSub}>18 units · <Text style={{ color: '#F59E0B' }}>Expires in 12h</Text></Text>
                <Text style={styles.itemPriceYellow}>₹1,620 at risk</Text>
              </View>
              <TouchableOpacity style={styles.actionBtnOutline}>
                <Text style={styles.actionBtnOutlineText}>ALLOCATE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section: Latest Scan */}
          <View style={styles.scanSummaryCard}>
            <View style={styles.scanSummaryHeader}>
              <View style={styles.scanSummaryIconWrap}>
                <Text style={styles.scanSummaryIcon}>📋</Text>
              </View>
              <View style={styles.scanSummaryInfo}>
                <Text style={styles.scanSummaryTitle}>Latest Scan</Text>
                <Text style={styles.scanSummarySub}>Rack A · 10:42 AM</Text>
              </View>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>Completed</Text>
              </View>
            </View>
            
            <View style={styles.scanStatsRow}>
              <View style={styles.scanStat}>
                <Text style={styles.scanStatLabel}>EXPECTED</Text>
                <Text style={styles.scanStatVal}>9</Text>
              </View>
              <View style={styles.scanStat}>
                <Text style={styles.scanStatLabel}>DETECTED</Text>
                <Text style={styles.scanStatVal}>9</Text>
              </View>
              <View style={styles.scanStat}>
                <Text style={[styles.scanStatLabel, { color: '#10B981' }]}>VERIFIED</Text>
                <Text style={[styles.scanStatVal, { color: '#10B981' }]}>8</Text>
              </View>
              <View style={styles.scanStat}>
                <Text style={[styles.scanStatLabel, { color: '#F59E0B' }]}>REVIEW</Text>
                <Text style={[styles.scanStatVal, { color: '#F59E0B' }]}>1</Text>
              </View>
            </View>

            <View style={styles.accuracyRow}>
              <Text style={styles.accuracyLabel}>Verification Accuracy</Text>
              <Text style={styles.accuracyVal}>89%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '89%' }]} />
            </View>

            <TouchableOpacity style={styles.viewScanBtn} onPress={() => router.push('/summary')}>
              <Text style={styles.viewScanBtnText}>VIEW SCAN</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIconActive}>🏠</Text>
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📦</Text>
          <Text style={styles.navText}>Inventory</Text>
        </TouchableOpacity>
        
        {/* Center Scan Button */}
        <View style={styles.navCenter}>
          <TouchableOpacity style={styles.navCenterBtn} onPress={handleScanPress} activeOpacity={0.9}>
            <View style={styles.navCenterInner}>
              <Text style={styles.navCenterIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.navCenterText}>Scan</Text>
        </View>

        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>⏱️</Text>
          <Text style={styles.navText}>Use First</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>☰</Text>
          <Text style={styles.navText}>More</Text>
        </TouchableOpacity>
      </View>
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
    color: colors.muted,
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
    color: '#D1D5DB',
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
    color: '#9CA3AF',
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
    color: '#9CA3AF',
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
    color: '#9CA3AF',
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
    color: '#9CA3AF',
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
    color: '#9CA3AF',
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
    color: '#D1D5DB',
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
    color: '#D1D5DB',
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
    color: '#9CA3AF',
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
