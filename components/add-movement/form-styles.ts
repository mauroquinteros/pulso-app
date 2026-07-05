import type { TextStyle, ViewStyle } from "react-native";

import { Colors } from "@/constants/theme";

/**
 * Style atoms shared verbatim by every add-movement form. Each screen spreads
 * these into its own `StyleSheet.create({ ...baseFormStyles, ...deltas })`, so
 * JSX keeps referencing `styles.label` etc. while the shared definitions live
 * in one place. Only the truly universal atoms (present and identical in all 5
 * screens) belong here; form-specific styles stay local.
 */
export const baseFormStyles = {
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  fields: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.negative,
    marginTop: 6,
    marginHorizontal: 2,
  },
  pairRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  smallBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  smallDollar: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5A6080",
    fontVariant: ["tabular-nums"],
  },
  smallInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
} satisfies Record<string, ViewStyle | TextStyle>;
