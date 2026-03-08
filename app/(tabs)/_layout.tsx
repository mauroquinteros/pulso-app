import { Tabs } from 'expo-router';

import TabBar from '@/components/ui/tab-bar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false }} />
      <Tabs.Screen name="movements" options={{ title: 'Movements', headerShown: false }} />
      <Tabs.Screen name="holdings" options={{ title: 'Holdings', headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', headerShown: false }} />
    </Tabs>
  );
}
