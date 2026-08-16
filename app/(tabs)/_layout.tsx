import { Tabs } from "expo-router";

import { RequireHistory } from "@/components/require-history";
import TabBar from "@/components/ui/tab-bar";
import { useReadStocks } from "@/hooks/use-read-stocks";

export default function TabLayout() {
  // Beside `RequireHistory` rather than inside it: the two reads go out at the
  // same moment and neither waits on the other, so a slow or failed History
  // still gets Quotes and a slow or failed Quote read hides nothing (ADR 0011).
  useReadStocks();

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
