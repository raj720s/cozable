import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts } from '../theme/scanner';

export type NavTab = 'home' | 'scan' | 'inventory' | 'use-first' | 'more';

interface BottomNavProps {
  active: NavTab;
}

const TABS: { id: NavTab; label: string; icon: string; route: string }[] = [
  { id: 'home', label: 'Home', icon: '⊞', route: '/home' },
  { id: 'scan', label: 'Scan', icon: '⊡', route: '/camera' },
  { id: 'inventory', label: 'Inventory', icon: '▣', route: '/inventory' },
  { id: 'use-first', label: 'Use First', icon: '!', route: '/home' },
  { id: 'more', label: 'More', icon: '···', route: '/home' },
];

export function BottomNav({ active }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const isScan = tab.id === 'scan';

        if (isScan) {
          return (
            <View key={tab.id} style={styles.centerTab}>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => router.push('/camera' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.scanIcon}>⊡</Text>
              </TouchableOpacity>
              <Text style={[styles.label, styles.labelActive]}>Scan</Text>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
    paddingTop: 2,
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    top: -18,
    gap: 4,
  },
  scanBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: {
    fontSize: 22,
    color: colors.primary,
  },
  icon: {
    fontSize: 18,
    color: colors.muted,
  },
  iconActive: {
    color: colors.primary,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.muted,
  },
  labelActive: {
    fontFamily: fonts.sansMd,
    color: colors.primary,
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
