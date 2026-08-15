import { Tabs } from "expo-router";

import { RequireHistory } from "@/components/require-history";
import TabBar from "@/components/ui/tab-bar";

export default function TabLayout() {
  return (
    <RequireHistory>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" options={{ headerShown: false }} />
        <Tabs.Screen name="movements" options={{ headerShown: false }} />
        <Tabs.Screen name="holdings" options={{ headerShown: false }} />
        <Tabs.Screen name="settings" options={{ headerShown: false }} />
      </Tabs>
    </RequireHistory>
  );
}
