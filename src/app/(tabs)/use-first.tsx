import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDayColourOps } from '../../hooks/useDayColourOps';
import { colors, fonts } from '../../theme/scanner';

/** FIFO queue: colours due today / tomorrow / already past in this Sun–Sat week. */
export default function UseFirstScreen() {
  const { today, useFirst, week } = useDayColourOps();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>FIFO · WEEK {today.weekLabel.toUpperCase()}</Text>
          <Text style={styles.title}>Use First</Text>
          <Text style={styles.body}>
            Pull {today.colour} ({today.weekday}) labels today. Past weekday colours are already
            overdue for this rotation week.
          </Text>

          <View style={styles.todayCard}>
            <View style={[styles.todayDot, { backgroundColor: today.hex }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.todayTitle}>Today · {today.pillText}</Text>
              <Text style={styles.todaySub}>Scan-detected day-dots map to delivery / use-by day</Text>
            </View>
            <TouchableOpacity style={styles.scanChip} onPress={() => router.push('/camera')}>
              <Text style={styles.scanChipText}>Scan</Text>
            </TouchableOpacity>
          </View>

          {useFirst.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Queue clear</Text>
              <Text style={styles.cardBody}>
                No scanned labels are due today or tomorrow. Complete a rack scan to populate this
                list.
              </Text>
            </View>
          ) : (
            useFirst.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={[styles.itemBar, { backgroundColor: item.hex }]} />
                <View style={styles.itemBody}>
                  <Text style={styles.itemName}>
                    {item.colour} · {item.weekday}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.units} labels · {item.useBy}
                  </Text>
                  <Text style={styles.itemDelivery}>{item.deliveryLabel}</Text>
                </View>
                <View
                  style={[
                    styles.urgencyPill,
                    item.isAtRisk ? styles.urgencyRisk : styles.urgencySoon,
                  ]}
                >
                  <Text style={styles.urgencyText}>
                    {item.urgency === 'expired'
                      ? 'OVERDUE'
                      : item.urgency === 'today'
                        ? 'TODAY'
                        : 'TMW'}
                  </Text>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.eyebrow, { marginTop: 20 }]}>THIS WEEK</Text>
          <View style={styles.weekList}>
            {week.map((d) => (
              <View key={d.shortDay} style={styles.weekRow}>
                <View style={[styles.weekDot, { backgroundColor: d.hex }]} />
                <Text style={styles.weekText}>
                  {d.shortDay} · {d.colour}
                  {d.isToday ? '  ← today' : d.isPast ? '  (past)' : ''}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.muted,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: colors.onSurface,
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
    marginBottom: 20,
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  todayDot: { width: 14, height: 14, borderRadius: 7 },
  todayTitle: { fontFamily: fonts.sansMd, fontSize: 15, color: colors.onSurface },
  todaySub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 2 },
  scanChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanChipText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.onPrimary },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  cardTitle: { fontFamily: fonts.sansMd, fontSize: 16, color: colors.primary },
  cardBody: { fontFamily: fonts.sans, fontSize: 14, color: colors.muted, lineHeight: 20 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  itemBar: { width: 4, alignSelf: 'stretch' },
  itemBody: { flex: 1, padding: 14, gap: 2 },
  itemName: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onSurface },
  itemMeta: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted },
  itemDelivery: { fontFamily: fonts.sans, fontSize: 12, color: colors.onSurfaceVariant },
  urgencyPill: {
    marginRight: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyRisk: { backgroundColor: colors.errorSoft },
  urgencySoon: { backgroundColor: 'rgba(59,130,246,0.15)' },
  urgencyText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.onSurface },
  weekList: { gap: 8, marginTop: 8 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekDot: { width: 10, height: 10, borderRadius: 5 },
  weekText: { fontFamily: fonts.sans, fontSize: 13, color: colors.onSurfaceVariant },
});
