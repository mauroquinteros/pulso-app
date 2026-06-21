import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { formatUSD } from '@/utils/format';

type Props = {
  totalInvested: number;
  totalFees: number;
  totalDividends: number;
};

function SummaryCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number;
  valueColor?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor ?? Colors.textPrimary }]}>
        {formatUSD(value)}
      </Text>
    </View>
  );
}

export function SummaryCards({ totalInvested, totalFees, totalDividends }: Props) {
  return (
    <View style={styles.container}>
      <SummaryCard label="TOTAL INVERTIDO" value={totalInvested} />
      <SummaryCard label="COMISIONES" value={totalFees} />
      <SummaryCard label="DIVIDENDOS" value={totalDividends} valueColor={Colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  value: {
    ...Typography.cardTitle,
  },
});
