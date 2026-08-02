import { Colors } from "@/constants/theme";
import { StyleSheet, Text, type TextProps } from "react-native";

export type TextType = "default" | "title" | "defaultSemiBold" | "subtitle" | "link";

export type ThemedTextProps = TextProps & {
  type?: TextType;
};

export function ThemedText({ style, type = "default", ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[
        { color: Colors.textPrimary },
        type === "default" && styles.default,
        type === "title" && styles.title,
        type === "defaultSemiBold" && styles.defaultSemiBold,
        type === "subtitle" && styles.subtitle,
        type === "link" && styles.link,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24 },
  defaultSemiBold: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  title: { fontSize: 32, fontWeight: "bold", lineHeight: 32 },
  subtitle: { fontSize: 20, fontWeight: "bold" },
  link: { lineHeight: 30, fontSize: 16, color: Colors.accent },
});
