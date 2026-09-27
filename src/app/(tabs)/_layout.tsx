import { Tabs } from 'expo-router';
import { AppTabBar } from '../../components/BottomNav';
import { colors } from '../../theme/scanner';

/**
 * Main shell tabs (Scan is center action → root `/camera`):
 * Home | Inventory | Scan | Use First | More
 */
export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => (
        <AppTabBar state={props.state} navigation={props.navigation} />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopColor: colors.border,
        },
      }}
    >
      {/* Order matches visual left→right around center Scan */}
      <Tabs.Screen  name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
      <Tabs.Screen name="use-first" options={{ title: 'Use First' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
