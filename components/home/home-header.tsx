import { BorderRadius } from "@/constants/layout";
import { Colors, Gradients } from "@/constants/theme";
import { MOCK_PROFILE } from "@/lib/mock-data";
import { initialsFrom } from "@/utils/profile";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

export function HomeHeader() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
        <Text style={styles.avatarInitials}>{initialsFrom(MOCK_PROFILE.name)}</Text>
      </LinearGradient>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={Colors.textSecondary} />
        <Text style={styles.searchText}>Buscar activo o ticker</Text>
      </View>
      <View style={styles.bell}>
        <Ionicons name="notifications-outline" size={18} color={Colors.textSecondary} />
        <View style={styles.bellDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: Colors.avatarText,
    fontWeight: "800",
    fontSize: 15,
  },
  search: {
    flex: 1,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  searchText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
});
