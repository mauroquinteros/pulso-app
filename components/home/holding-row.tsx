import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { formatUSD } from '@/utils/format';

export type HoldingItem = {
  ticker: string;
  name: string;
  value: number;
  pnl: number;
  pnlPercent: number;
};

type Props = HoldingItem & { onPress?: () => void };

export function HoldingRow({ ticker, name, value, pnl, pnlPercent, onPress }: Props) {
  const isPositive = pnl >= 0;
  const sign = isPositive ? '+' : '';
  const pnlColor = isPositive ? Colors.positive : Colors.negative;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={styles.ticker}>{ticker}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>{formatUSD(value)}</Text>
        <Text style={[styles.pnl, { color: pnlColor }]}>
          {sign}{formatUSD(pnl)} ({sign}{pnlPercent.toFixed(1)}%)
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  ticker: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  name: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  value: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  pnl: {
    ...Typography.body,
  },
});
