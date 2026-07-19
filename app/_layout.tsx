import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { applyManropeDefaultFont } from "@/lib/manrope-font";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Keep the splash screen visible until the fonts are loaded so there is no
// flash of unstyled / missing text.
SplashScreen.preventAutoHideAsync();

// Make Manrope the default font for every <Text> app-wide (resolving weight to
// the matching Manrope file). Replaces the old Text.defaultProps hack, a no-op
// under React 19.
applyManropeDefaultFont();

export default function RootLayout() {
  const [loaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Draw their own ScreenHeader, like the add-movement forms. */}
        <Stack.Screen name="stock/[ticker]" options={{ headerShown: false }} />
        <Stack.Screen name="movement/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-movement"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
