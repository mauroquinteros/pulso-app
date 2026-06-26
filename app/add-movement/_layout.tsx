import { Stack } from "expo-router";

export default function AddMovementLayout() {
  // Both screens render their own in-screen header (✕ picker, ‹ Depósito).
  return <Stack screenOptions={{ headerShown: false }} />;
}
