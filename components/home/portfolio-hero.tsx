import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { formatUSD } from '@/utils/format';

type Props = {
  totalValue: number;
  netPnl: number;
  netPnlPercent: number;
};

export function PortfolioHero({ totalValue, netPnl, netPnlPercent }: Props) {
  const isPositive = netPnl >= 0;
  const sign = isPositive ? '+' : '';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Valor total del portafolio</Text>
      <Text style={styles.value}>{formatUSD(totalValue)}</Text>
      <View style={[styles.badge, isPositive ? styles.badgePositive : styles.badgeNegative]}>
        <Text style={[styles.badgeText, { color: isPositive ? Colors.accent : Colors.negative }]}>
          Net P&L: {sign}{formatUSD(netPnl)} ({sign}{netPnlPercent.toFixed(1)}%)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  label: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    color: Colors.textPrimary,
  },
  badge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgePositive: {
    backgroundColor: 'rgba(0, 229, 204, 0.12)',
    borderColor: Colors.accent,
  },
  badgeNegative: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: Colors.negative,
  },
  badgeText: {
    ...Typography.badge,
  },
});
