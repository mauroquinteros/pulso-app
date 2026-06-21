import { BorderRadius, Spacing } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { StyleSheet, Text, View } from "react-native";
import { HoldingRow, type HoldingItem } from "./holding-row";

type Props = {
  holdings: HoldingItem[];
  onPressHolding?: (ticker: string) => void;
};

export function HoldingsList({ holdings, onPressHolding }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mis Activos</Text>
      <View style={styles.list}>
        {holdings.map((h) => (
          <HoldingRow
            key={h.ticker}
            {...h}
            onPress={() => onPressHolding?.(h.ticker)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  header: {
    ...Typography.sectionHeader,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
  },
});
