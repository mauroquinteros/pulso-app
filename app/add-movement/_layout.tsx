import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function AddMovementLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
      }}
    />
  );
}
