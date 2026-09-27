import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, type AppIconName } from './AppIcon';
import { colors, fonts } from '../theme/scanner';

export type NavTab = 'home' | 'inventory' | 'scan' | 'use-first' | 'more';

type SideTab = {
  id: Exclude<NavTab, 'scan'>;
  label: string;
  icon: AppIconName;
  routeName: 'home' | 'inventory' | 'use-first' | 'more';
};

type AppTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

const LEFT_TABS: SideTab[] = [
  { id: 'home', label: 'Home', icon: 'home', routeName: 'home' },
  { id: 'inventory', label: 'Inventory', icon: 'package-variant-closed', routeName: 'inventory' },
];

const RIGHT_TABS: SideTab[] = [
  { id: 'use-first', label: 'Use First', icon: 'clock-alert-outline', routeName: 'use-first' },
  { id: 'more', label: 'More', icon: 'dots-horizontal', routeName: 'more' },
];

function resolveActive(routeName: string | undefined): NavTab {
  switch (routeName) {
    case 'inventory':
      return 'inventory';
    case 'use-first':
      return 'use-first';
    case 'more':
      return 'more';
    case 'home':
    default:
      return 'home';
  }
}

function SideTabButton({
  tab,
  active,
  onPress,
}: {
  tab: SideTab;
  active: boolean;
  onPress: () => void;
}) {
  const tint = active ? colors.primary : colors.onSurfaceVariant;
  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <AppIcon name={tab.icon} size={22} color={tint} />
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {tab.label}
      </Text>
      {active ? <View style={styles.activeDot} /> : null}
    </TouchableOpacity>
  );
}

/**
 * Home | Inventory | [Scan] | Use First | More
 * Scan pushes root `/camera`.
 */
export function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const active = resolveActive(state.routes[state.index]?.name);
  const bottomPad = Math.max(insets.bottom, 10);

  const openTab = (routeName: SideTab['routeName']) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={styles.sideGroup}>
        {LEFT_TABS.map((tab) => (
          <SideTabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onPress={() => openTab(tab.routeName)}
          />
        ))}
      </View>

      <View style={styles.centerSlot}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push('/camera')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open scanner"
        >
          <AppIcon name="camera" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.label, styles.labelActive]}>Scan</Text>
      </View>

      <View style={styles.sideGroup}>
        {RIGHT_TABS.map((tab) => (
          <SideTabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onPress={() => openTab(tab.routeName)}
          />
        ))}
      </View>
    </View>
  );
}

export function BottomNav({ active }: { active: NavTab }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  const go = (routeName: SideTab['routeName']) => {
    if (routeName === 'home') router.navigate('/home');
    else if (routeName === 'inventory') router.navigate('/inventory');
    else if (routeName === 'use-first') router.navigate('/use-first');
    else if (routeName === 'more') router.navigate('/more');
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={styles.sideGroup}>
        {LEFT_TABS.map((tab) => (
          <SideTabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onPress={() => go(tab.routeName)}
          />
        ))}
      </View>
      <View style={styles.centerSlot}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push('/camera')}
          activeOpacity={0.85}
        >
          <AppIcon name="camera" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.label, styles.labelActive]}>Scan</Text>
      </View>
      <View style={styles.sideGroup}>
        {RIGHT_TABS.map((tab) => (
          <SideTabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onPress={() => go(tab.routeName)}
          />
        ))}
      </View>
    </View>
  );
}

const TAB_BAR_CONTENT = 58;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 4,
    paddingTop: 8,
    minHeight: TAB_BAR_CONTENT,
  },
  sideGroup: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingBottom: 2,
    minHeight: 48,
  },
  centerSlot: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -22,
    gap: 2,
    paddingBottom: 2,
  },
  scanBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: fonts.sansMd,
    color: colors.primary,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 1,
  },
});
