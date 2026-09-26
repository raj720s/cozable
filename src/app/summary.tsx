import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/scanner';

export default function SummaryScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Text style={styles.iconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Batch Detection Results</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={styles.iconText}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn}>
              <Text style={styles.avatarText}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Top Filter Bar */}
          <View style={styles.filterBar}>
            <View style={styles.pillActive}>
              <View style={styles.pillDotGreen} />
              <Text style={styles.pillTextActive}>RACK A · 9 ITEMS EXTRACTED</Text>
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Text style={styles.filterBtnIcon}>☷</Text>
              <Text style={styles.filterBtnText}>FILTER</Text>
            </TouchableOpacity>
          </View>

          {/* Spectral Batch Analysis Card */}
          <View style={styles.analysisCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardIcon}>⚛️</Text>
                <Text style={styles.cardEyebrow}>SPECTRAL BATCH ANALYSIS</Text>
              </View>
              <View style={styles.badgeMuted}>
                <Text style={styles.badgeMutedText}>#BCH-8824</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>Rack A • Chilled Bay 03</Text>
            <View style={styles.cardSubRow}>
              <Text style={styles.cardSubIcon}>⏱️</Text>
              <Text style={styles.cardSubText}>Auto-calibrated scan completed 2m ago</Text>
            </View>
            
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Extracted</Text>
                <Text style={styles.metricValue}>09 <Text style={styles.metricUnit}>units</Text></Text>
              </View>
              <View style={[styles.metricItem, styles.metricBorder]}>
                <Text style={[styles.metricLabel, { color: '#10B981' }]}>Validated</Text>
                <Text style={[styles.metricValue, { color: '#10B981' }]}>8/9 <Text style={styles.metricUnit}>(89%)</Text></Text>
              </View>
              <View style={[styles.metricItem, styles.metricBorder, { borderLeftColor: '#EF4444' }]}>
                <Text style={[styles.metricLabel, { color: '#EF4444' }]}>Conflict</Text>
                <Text style={[styles.metricValue, { color: '#EF4444' }]}>01 <Text style={styles.metricUnitAlert}>alert</Text></Text>
              </View>
            </View>
          </View>

          {/* Sensor Aperture Card */}
          <View style={styles.sensorCard}>
            <View style={styles.sensorInfo}>
              <View style={styles.cardTitleRow}>
                <View style={styles.pillDotBlue} />
                <Text style={styles.cardEyebrow}>SENSOR APERTURE: ACTIVE</Text>
              </View>
              <Text style={styles.sensorTitle}>520nm – 650nm Chromatic Pass</Text>
              <Text style={styles.sensorSub}>High-speed OCR Multi-Vector Pass • Auto Stroboscopic</Text>
            </View>
            <View style={styles.sensorIconWrap}>
              <Text style={styles.sensorIcon}>📸</Text>
            </View>
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            <TouchableOpacity style={styles.tabActive}>
              <Text style={styles.tabActiveText}>All (9)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabInactive}>
              <View style={styles.pillDotGreen} />
              <Text style={styles.tabInactiveText}>Verified (8)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabInactiveError}>
              <View style={styles.pillDotRed} />
              <Text style={styles.tabInactiveErrorText}>Rotation Conflict (1)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabInactive}>
              <View style={styles.pillDotGray} />
              <Text style={styles.tabInactiveText}>Pending (0)</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* List Items */}
          <View style={styles.listContainer}>
            
            {/* Item 1: Green Chutney */}
            <View style={styles.itemCard}>
              <View style={styles.itemRowMain}>
                <View style={styles.itemThumb}>
                  <View style={[styles.thumbColor, { backgroundColor: '#4D7C0F' }]} />
                  <Text style={styles.thumbDay}>FRI GRN</Text>
                  <Text style={styles.thumbSub}>520nm</Text>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>Green Chutney</Text>
                    <View style={styles.codeBadge}><Text style={styles.codeBadgeText}>FD-047</Text></View>
                    <Text style={styles.itemArrow}>⌄</Text>
                  </View>
                  <Text style={styles.itemMeta}>Prep: 25-09 • Exp: 27-09-2026</Text>
                  <View style={styles.itemStatusRow}>
                    <View style={styles.validBadge}>
                      <Text style={styles.validBadgeIcon}>✓</Text>
                      <Text style={styles.validBadgeText}>Valid • 1 day left</Text>
                    </View>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>99.4% Match</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.itemFooterText}>☷ Item Code: FD-047 | Exp: 27-.. <Text style={styles.haccpValid}>HACCP VALID</Text></Text>
              </View>
            </View>

            {/* Item 2: Mint Mayo */}
            <View style={styles.itemCard}>
              <View style={styles.itemRowMain}>
                <View style={styles.itemThumb}>
                  <View style={[styles.thumbColor, { backgroundColor: '#4D7C0F' }]} />
                  <Text style={styles.thumbDay}>FRI GRN</Text>
                  <Text style={styles.thumbSub}>522nm</Text>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>Mint Mayo Dressing</Text>
                    <View style={styles.codeBadge}><Text style={styles.codeBadgeText}>FD-048</Text></View>
                    <Text style={styles.itemArrow}>⌄</Text>
                  </View>
                  <Text style={styles.itemMeta}>Prep: 25-09 • Exp: 28-09-2026</Text>
                  <View style={styles.itemStatusRow}>
                    <View style={styles.validBadge}>
                      <Text style={styles.validBadgeIcon}>✓</Text>
                      <Text style={styles.validBadgeText}>Valid • 2 days left</Text>
                    </View>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>98.7% Match</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.itemFooterText}>☷ Optical OCR Score: 99.1% Con.. <Text style={styles.haccpValid}>HACCP VALID</Text></Text>
              </View>
            </View>

            {/* Item 3: Conflict */}
            <View style={[styles.itemCard, styles.itemCardError]}>
              <View style={styles.errorIndicator} />
              <View style={styles.itemRowMain}>
                <View style={[styles.itemThumb, styles.itemThumbError]}>
                  <View style={[styles.thumbColor, { backgroundColor: '#DC2626' }]} />
                  <Text style={[styles.thumbDay, { color: '#FCA5A5' }]}>WED RED</Text>
                  <Text style={[styles.thumbSub, { color: '#FCA5A5' }]}>650nm</Text>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.itemTitle, { color: '#FCA5A5' }]}>Chicken Salad Sandwich</Text>
                    <Text style={styles.alertIcon}>!</Text>
                  </View>
                  <View style={[styles.codeBadge, { backgroundColor: '#991B1B', alignSelf: 'flex-start', marginTop: 4 }]}><Text style={[styles.codeBadgeText, { color: '#FCA5A5' }]}>FD-013</Text></View>
                  <Text style={styles.itemMeta}>Prep: 23-09 •</Text>
                  <Text style={styles.itemMetaAlert}>Exp: 25-09-2026 (Expires Today!)</Text>
                  
                  <View style={styles.mismatchBadge}>
                    <Text style={styles.mismatchBadgeText}>⚠️ Day Color Mismatch</Text>
                  </View>
                  <View style={styles.expectedBadge}>
                    <Text style={styles.expectedBadgeText}>Expected: MON Blue</Text>
                  </View>
                </View>
              </View>
              <View style={styles.errorFooter}>
                <View style={styles.errorFooterRow}>
                  <Text style={styles.errorFooterText}>Detected Wednesday Red (650nm)</Text>
                  <Text style={styles.errorFooterFlag}>Flagged for Supervisor</Text>
                </View>
                <View style={styles.errorActionsRow}>
                  <TouchableOpacity style={styles.rescanBtn}>
                    <Text style={styles.rescanBtnText}>↻ Re-Scan Tag</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.overrideBtn}>
                    <Text style={styles.overrideBtnText}>📝 Override Code</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Item 4: Vegetable Wrap */}
            <View style={styles.itemCard}>
              <View style={styles.itemRowMain}>
                <View style={styles.itemThumb}>
                  <View style={[styles.thumbColor, { backgroundColor: '#4D7C0F' }]} />
                  <Text style={styles.thumbDay}>FRI GRN</Text>
                  <Text style={styles.thumbSub}>527nm</Text>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>Vegetable Wrap Deluxe</Text>
                    <Text style={styles.itemArrow}>⌄</Text>
                  </View>
                  <View style={styles.codeBadge}><Text style={styles.codeBadgeText}>FD-082</Text></View>
                  <Text style={styles.itemMeta}>Prep: 25-09 • Exp: 26-09-2026</Text>
                  <View style={styles.itemStatusRow}>
                    <View style={styles.validBadge}>
                      <Text style={styles.validBadgeIcon}>✓</Text>
                      <Text style={styles.validBadgeText}>Valid • 18h left</Text>
                    </View>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>97.9% Match</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.itemFooterText}>☰ Lot #20260925-B4 <Text style={styles.haccpValid}>HACCP VALID</Text></Text>
              </View>
            </View>

            {/* Audit Assurance */}
            <View style={styles.auditCard}>
              <View style={styles.auditHeader}>
                <Text style={styles.auditTitle}>📋 Audit Assurance</Text>
                <Text style={styles.auditBadge}>ISO-22000 Certified</Text>
              </View>
              <Text style={styles.auditBody}>
                8 of 9 scanned containers match the designated Friday Green palette (519-522nm). Item FD-013 must be cleared prior to ERP ledger synchronization.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.exportBtn}>
          <Text style={styles.exportBtnText}>📥 Export Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={() => router.replace('/home')}>
          <Text style={styles.confirmBtnText}>✓ Confirm All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14', // Base dark background
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 8,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // For bottom bar
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  pillDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  pillDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  pillDotBlue: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  pillDotGray: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7280',
  },
  pillTextActive: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: '#A7F3D0',
    letterSpacing: 0.5,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterBtnIcon: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  filterBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  analysisCard: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262A36',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardIcon: {
    fontSize: 14,
  },
  cardEyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  badgeMuted: {
    backgroundColor: '#1F2430',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeMutedText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#9CA3AF',
  },
  cardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  cardSubIcon: {
    fontSize: 12,
  },
  cardSubText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: '#9CA3AF',
  },
  metricsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#262A36',
    paddingTop: 12,
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#262A36',
    paddingLeft: 12,
  },
  metricLabel: {
    fontFamily: fonts.sansMd,
    fontSize: 11,
    color: '#D1D5DB',
  },
  metricValue: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  metricUnit: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: '#9CA3AF',
  },
  metricUnitAlert: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: '#FCA5A5',
  },
  sensorCard: {
    flexDirection: 'row',
    backgroundColor: '#161A23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262A36',
    alignItems: 'center',
  },
  sensorInfo: {
    flex: 1,
    gap: 6,
  },
  sensorTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sensorSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  sensorIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  sensorIcon: {
    fontSize: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabActiveText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#000000',
  },
  tabInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161A23',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#262A36',
  },
  tabInactiveText: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: '#D1D5DB',
  },
  tabInactiveError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  tabInactiveErrorText: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: '#FCA5A5',
  },
  listContainer: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262A36',
    overflow: 'hidden',
  },
  itemCardError: {
    borderColor: '#EF4444',
  },
  errorIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#EF4444',
  },
  itemRowMain: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  itemThumb: {
    width: 48,
    height: 60,
    backgroundColor: '#1F2430',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  itemThumbError: {
    backgroundColor: '#451A1A',
    borderColor: '#7F1D1D',
  },
  thumbColor: {
    width: 20,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  thumbDay: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: '#A7F3D0',
  },
  thumbSub: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: '#A7F3D0',
    marginTop: 2,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  codeBadge: {
    backgroundColor: '#262A36',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: '#9CA3AF',
  },
  itemArrow: {
    color: '#9CA3AF',
    fontSize: 16,
    marginLeft: 'auto',
  },
  alertIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
  itemMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#D1D5DB',
    marginTop: 4,
  },
  itemMetaAlert: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#FCA5A5',
    marginTop: 2,
  },
  itemStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validBadgeIcon: {
    color: '#10B981',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    width: 12,
    height: 12,
    textAlign: 'center',
    lineHeight: 12,
  },
  validBadgeText: {
    fontFamily: fonts.sansMd,
    fontSize: 10,
    color: '#10B981',
  },
  matchBadge: {
    backgroundColor: '#1F2430',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeText: {
    fontFamily: fonts.sansMd,
    fontSize: 10,
    color: '#9CA3AF',
  },
  mismatchBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  mismatchBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  expectedBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  expectedBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#D1D5DB',
  },
  itemFooter: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#262A36',
  },
  itemFooterText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#9CA3AF',
  },
  haccpValid: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  errorFooter: {
    backgroundColor: '#111827',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  errorFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorFooterText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: '#D1D5DB',
  },
  errorFooterFlag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: '#FCA5A5',
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rescanBtn: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rescanBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  overrideBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  overrideBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  auditCard: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262A36',
    padding: 16,
    marginTop: 8,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  auditTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#D1D5DB',
  },
  auditBadge: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: '#10B981',
  },
  auditBody: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111827',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24, // Safe area
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#262A36',
  },
  exportBtn: {
    flex: 1,
    backgroundColor: '#1F2430',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  exportBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#D1D5DB',
  },
  confirmBtn: {
    flex: 1.5,
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#000000',
  },
});
