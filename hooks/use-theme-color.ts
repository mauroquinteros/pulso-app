import { Colors } from "@/constants/theme";

type ColorName = keyof typeof Colors;

export function useThemeColor(colorName: ColorName): string {
  return Colors[colorName];
}
