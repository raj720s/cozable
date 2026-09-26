import { router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { StatusBadge } from '../components/StatusBadge';
import { colors, fonts } from '../theme/scanner';

// ─── Data ────────────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'at-risk' | 'use-soon';

type ActionType = 'use-first' | 'allocate' | 'optimal' | 'details' | 'haccp';

interface FoodItem {
  id: string;
  name: string;
  batchCode: string;
  units: number;
  value: string;
  isAtRisk: boolean;
  useBy: string;
  location?: string;
  action: ActionType;
  dotColor: string;
}

const FOOD_ITEMS: FoodItem[] = [
  {
    id: '1',
    name: 'Chicken Sandwich',
    batchCode: 'B102',
    units: 24,
    value: '₹2,400 at risk',
    isAtRisk: true,
    useBy: 'Today · 8:00 PM',
    action: 'use-first',
    dotColor: '#EF4444',
  },
  {
    id: '2',
    name: 'Vegetable Wrap',
    batchCode: 'B108',
    units: 18,
    value: '₹1,260 value',
    isAtRisk: false,
    useBy: 'Tomorrow · 12:00 PM',
    action: 'allocate',
    dotColor: '#3B82F6',
  },
  {
    id: '3',
    name: 'Fruit Box',
    batchCode: 'B115',
    units: 40,
    value: '₹2,200 value',
    isAtRisk: false,
    useBy: 'Use by: 28 Sep',
    action: 'optimal',
    dotColor: '#10B981',
  },
  {
    id: '4',
    name: 'Green Chutney',
    batchCode: 'FD-047',
    units: 24,
    value: '',
    isAtRisk: false,
    useBy: 'Use by: 27 Sep 2026 (1 day left)',
    location: 'Shelf 3 Bay 03',
    action: 'haccp',
    dotColor: '#10B981',
  },
  {
    id: '5',
    name: 'Greek Yogurt Cup',
    batchCode: 'Batch 44',
    units: 16,
    value: '',
    isAtRisk: false,
    useBy: 'Use by: 29 Sep 2026',
    action: 'details',
    dotColor: '#3B82F6',
  },
];

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionButton({ action }: { action: ActionType }) {
  if (action === 'use-first') {
    return (
      <TouchableOpacity style={actionStyles.useFirst}>
        <Text style={actionStyles.useFirstText}>! Use First</Text>
      </TouchableOpacity>
    );
  }
  if (action === 'allocate') {
    return (
      <TouchableOpacity style={actionStyles.allocate}>
        <Text style={actionStyles.allocateText}>⇆ Allocate</Text>
      </TouchableOpacity>
    );
  }
  if (action === 'optimal') {
    return (
      <TouchableOpacity style={actionStyles.optimal}>
        <Text style={actionStyles.optimalText}>⊙ Optimal</Text>
      </TouchableOpacity>
    );
  }
  if (action === 'haccp') {
    return (
      <View style={actionStyles.haccp}>
        <Text style={actionStyles.haccpText}>⊙ HACCP</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity style={actionStyles.details}>
      <Text style={actionStyles.detailsText}>Details ›</Text>
    </TouchableOpacity>
  );
}

const actionStyles = StyleSheet.create({
  useFirst: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  useFirstText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#FFF' },
  allocate: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  allocateText: { fontFamily: fonts.sansMd, fontSize: 11, color: '#93C5FD' },
  optimal: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  optimalText: { fontFamily: fonts.sansMd, fontSize: 11, color: colors.primary },
  haccp: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  haccpText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.primary },
  details: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  detailsText: { fontFamily: fonts.sansMd, fontSize: 11, color: colors.muted },
});

// ─── Food Item Row ────────────────────────────────────────────────────────────
function FoodItemRow({ item }: { item: FoodItem }) {
  return (
    <View style={row.container}>
      {/* Left accent bar for at-risk */}
      {item.isAtRisk && <View style={row.accentBar} />}

      {/* Icon */}
      <View style={[row.iconWrap, { borderColor: item.dotColor + '55' }]}>
        <View style={[row.dot, { backgroundColor: item.dotColor }]} />
      </View>

      {/* Info */}
      <View style={row.info}>
        <View style={row.nameRow}>
          <Text style={row.name} numberOfLines={1}>
            {item.name}{' '}
            {item.batchCode && (
              <Text style={row.batchCode}>({item.batchCode})</Text>
            )}
          </Text>
          {item.value ? (
            <Text style={[row.value, item.isAtRisk && row.valueRisk]}>{item.value}</Text>
          ) : null}
        </View>

        <Text style={row.units}>
          {item.units} units{item.location ? ` · ${item.location}` : ` · ${item.batchCode}`}
        </Text>

        <View style={row.useByRow}>
          <Text style={row.useByIcon}>{item.isAtRisk ? '⏰' : '📅'}</Text>
          <Text style={row.useBy}>{item.useBy}</Text>
        </View>
      </View>

      {/* Action */}
      <ActionButton action={item.action} />
    </View>
  );
}

const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.error,
    borderRadius: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.onSurface,
    flex: 1,
  },
  batchCode: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.muted,
  },
  value: {
    fontFamily: fonts.sansMd,
    fontSize: 11,
    color: colors.muted,
    flexShrink: 0,
  },
  valueRisk: {
    color: '#FCA5A5',
    backgroundColor: colors.errorSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  units: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.muted,
  },
  useByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  useByIcon: { fontSize: 10 },
  useBy: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchText, setSearchText] = useState('');

  const filteredItems = FOOD_ITEMS.filter((item) => {
    const matchSearch =
      searchText === '' ||
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.batchCode.toLowerCase().includes(searchText.toLowerCase());
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'at-risk' && item.isAtRisk) ||
      (activeTab === 'use-soon' && !item.isAtRisk);
    return matchSearch && matchTab;
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* App Header */}
        <AppHeader
          title="Inventory"
          showLiveDot
          rightIcon="⚙"
          onRightPress={() => {}}
          rightIcon2="👤"
          onRightPress2={() => {}}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sub-header */}
          <View style={styles.subHeader}>
            <View style={styles.subHeaderLeft}>
              <View style={styles.titleWithDot}>
                <Text style={styles.subTitle}>Inventory</Text>
                <View style={styles.liveDot} />
              </View>
              <Text style={styles.itemCount}>
                257 items in stock{' '}
                <Text style={styles.syncedText}>(+9 synced)</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.searchIconBtn}>
              <Text style={styles.searchIconText}>🔍</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search food / batch..."
              placeholderTextColor={colors.muted}
              value={searchText}
              onChangeText={setSearchText}
              selectionColor={colors.primary}
            />
            <TouchableOpacity style={styles.barcodeBtn}>
              <Text style={styles.barcodeIcon}>⊞</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={styles.tabsRow}>
            {([
              { id: 'all', label: 'All', count: 257, dot: '' },
              { id: 'at-risk', label: 'At Risk', count: 12, dot: colors.error },
              { id: 'use-soon', label: 'Use Soon', count: 8, dot: '#3B82F6' },
            ] as { id: FilterTab; label: string; count: number; dot: string }[]).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.75}
              >
                {tab.dot ? <View style={[styles.tabDot, { backgroundColor: tab.dot }]} /> : null}
                <Text
                  style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
                >
                  {tab.label} {tab.count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>INVENTORY SUMMARY</Text>
              <View style={styles.onlineRow}>
                <Text style={styles.onlineWave}>〰</Text>
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryVal}>257</Text>
                <Text style={styles.summaryLabel}>Total Items</Text>
              </View>
              <View style={styles.summaryStat}>
                <View style={styles.summaryDotRow}>
                  <View style={[styles.summaryDot, { backgroundColor: colors.error }]} />
                  <Text style={[styles.summaryVal, { color: '#FCA5A5' }]}>12</Text>
                </View>
                <Text style={styles.summaryLabel}>At Risk</Text>
              </View>
              <View style={styles.summaryStat}>
                <View style={styles.summaryDotRow}>
                  <View style={[styles.summaryDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={[styles.summaryVal, { color: '#93C5FD' }]}>8</Text>
                </View>
                <Text style={styles.summaryLabel}>Use First</Text>
              </View>
            </View>
          </View>

          {/* Batch Banner */}
          <TouchableOpacity style={styles.batchBanner} activeOpacity={0.8}>
            <View style={styles.batchLeft}>
              <View style={styles.batchIconWrap}>
                <Text style={styles.batchIcon}>⊙</Text>
              </View>
              <View>
                <View style={styles.batchTitleRow}>
                  <Text style={styles.batchTitle}>Batch #BCH-8824</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                </View>
                <Text style={styles.batchSub}>9 items confirmed 2m ago</Text>
              </View>
            </View>
            <Text style={styles.batchArrow}>›</Text>
          </TouchableOpacity>

          {/* Food Items Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FOOD ITEMS</Text>
            <Text style={styles.sectionSubtitle}> (Sorted by urgency)</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.filterBtn}>
              <Text style={styles.filterText}>Filter ⚙</Text>
            </TouchableOpacity>
          </View>

          {/* Items list */}
          <View style={styles.listCard}>
            {filteredItems.map((item) => (
              <FoodItemRow key={item.id} item={item} />
            ))}
            {filteredItems.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No items match your filter.</Text>
              </View>
            )}
          </View>

          {/* Bottom padding for nav bar */}
          <View style={{ height: 96 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Nav */}
      <BottomNav active="inventory" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  // Sub-header
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subHeaderLeft: { gap: 4 },
  titleWithDot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.onSurface,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  itemCount: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  syncedText: {
    color: colors.primary,
    fontFamily: fonts.sansMd,
  },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconText: { fontSize: 16 },
  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.onSurface,
  },
  barcodeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeIcon: { fontSize: 14, color: colors.muted },
  // Filter tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabText: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: colors.muted,
  },
  tabTextActive: {
    color: '#003824',
  },
  // Summary card
  summaryCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineWave: { fontSize: 12, color: colors.primary },
  onlineText: {
    fontFamily: fonts.sansMd,
    fontSize: 11,
    color: colors.primary,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: { alignItems: 'flex-start', gap: 4 },
  summaryDotRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },
  summaryVal: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: colors.onSurface,
  },
  summaryLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
  // Batch banner
  batchBanner: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  batchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchIcon: { fontSize: 16, color: colors.primary },
  batchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  batchTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  newBadge: {
    backgroundColor: 'rgba(78,222,163,0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  batchSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  batchArrow: { fontSize: 22, color: colors.muted },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.3,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerHigh,
  },
  filterText: {
    fontFamily: fonts.sansMd,
    fontSize: 11,
    color: colors.muted,
  },
  // List
  listCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
});
