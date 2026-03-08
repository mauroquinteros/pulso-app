import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Stock: {ticker}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
