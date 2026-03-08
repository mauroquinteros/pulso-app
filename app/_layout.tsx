import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="stock/[ticker]"
          options={{
            title: 'Stock Detail',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="movement/[id]"
          options={{
            title: 'Movement Detail',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="add-movement"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
