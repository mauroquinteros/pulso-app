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
import { useSessionStore } from "@/stores/session";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Keep the splash screen visible until the fonts are loaded and the session is
// known, so there is no flash of unstyled text and no flash of the sign-in
// screen for someone who is already signed in.
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

  const session = useSessionStore((state) => state.session);
  // `undefined` is "not yet read from storage", which is not the same as signed
  // out. Holding the splash through it is what lets the first paint already know
  // the answer, and it neutralises the documented Stack.Protected limitation
  // where a protected screen can flash before the guard redirects.
  const sessionPending = session === undefined;
  const isSignedIn = !!session;

  useEffect(() => {
    if (loaded && !sessionPending) {
      SplashScreen.hideAsync();
    }
  }, [loaded, sessionPending]);

  if (!loaded || sessionPending) {
    return null;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      {/* Both directions are declarative. When a guard falls, Expo Router removes
          those screens from the tree, redirects to the anchor and clears the
          history itself - so there is no navigation code here, and none on
          sign-in or sign-out either. The guard is UX, not security: it is
          client-side only, and RLS is what controls data access. */}
      <Stack>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Draw their own ScreenHeader, like the add-movement forms. */}
          <Stack.Screen name="stock/[ticker]" options={{ headerShown: false }} />
          <Stack.Screen name="movement/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="add-movement" options={{ presentation: "modal", headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
