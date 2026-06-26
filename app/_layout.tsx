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
import { Text } from "react-native";

import { Colors } from "@/constants/theme";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Keep the splash screen visible until the fonts are loaded so there is no
// flash of unstyled / missing text.
SplashScreen.preventAutoHideAsync();

// Apply Manrope as the global default font so every <Text> picks it up even when
// a component sets an inline fontWeight without a fontFamily.
const TextWithDefault = Text as typeof Text & {
  defaultProps?: { style?: { fontFamily: string } };
};
TextWithDefault.defaultProps = TextWithDefault.defaultProps ?? {};
TextWithDefault.defaultProps.style = { fontFamily: "Manrope_400Regular" };

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
        <Stack.Screen
          name="stock/[ticker]"
          options={{
            title: "Stock Detail",
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="movement/[id]"
          options={{
            title: "Movement Detail",
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="add-movement"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
