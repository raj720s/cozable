import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDayColourOps } from '../../hooks/useDayColourOps';
import { colors, fonts } from '../../theme/scanner';
import { DAY_COLOUR_CLASSES } from '../../utils/dayColourCalendar';

/** Rotation legend + this week’s Sun–Sat map driven by calendar date. */
export default function MoreScreen() {
  const { today, week, stock, totalUnits } = useDayColourOps();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>HACCP DAY-COLOUR</Text>
          <Text style={styles.title}>Rotation</Text>
          <Text style={styles.body}>
            Each label colour maps to a weekday delivery / use-by. The model class order matches
            this table. Screens roll up scans for the current Sunday–Saturday week.
          </Text>

          <View style={styles.todayCard}>
            <View style={[styles.bigDot, { backgroundColor: today.hex }]} />
            <View>
              <Text style={styles.todayTitle}>{today.pillText}</Text>
              <Text style={styles.todaySub}>Week {today.weekLabel}</Text>
              <Text style={styles.todaySub}>{totalUnits} labels scanned this week</Text>
            </View>
          </View>

          <Text style={styles.section}>MODEL CLASS → WEEKDAY</Text>
          {DAY_COLOUR_CLASSES.map((c) => {
            const count = stock.find((s) => s.classId === c.classId)?.units ?? 0;
            const cell = week.find((w) => w.classId === c.classId);
            return (
              <View key={c.classId} style={styles.row}>
                <View style={[styles.swatch, { backgroundColor: c.hex }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {c.colour} · {c.weekday}
                  </Text>
                  <Text style={styles.rowSub}>
                    class {c.classId}
                    {cell?.isToday ? ' · today' : cell?.isPast ? ' · past this week' : ' · upcoming'}
                  </Text>
                </View>
                <Text style={styles.count}>{count}</Text>
              </View>
            );
          })}
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
    gap: 14,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
  },
  bigDot: { width: 28, height: 28, borderRadius: 14 },
  todayTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.onSurface },
  todaySub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 2 },
  section: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  swatch: { width: 16, height: 16, borderRadius: 4 },
  rowTitle: { fontFamily: fonts.sansMd, fontSize: 14, color: colors.onSurface },
  rowSub: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, marginTop: 2 },
  count: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.primary, minWidth: 28, textAlign: 'right' },
});
