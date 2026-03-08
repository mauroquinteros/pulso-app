import { Colors } from "@/constants/theme";
import { Spacing } from "@/constants/layout";
import { Typography } from "@/constants/typography";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  index: { active: "home", inactive: "home-outline" },
  movements: { active: "swap-horizontal", inactive: "swap-horizontal-outline" },
  holdings: { active: "pie-chart", inactive: "pie-chart-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

const TAB_LABELS: Record<string, string> = {
  index: "Home",
  movements: "Movements",
  holdings: "Holdings",
  settings: "Settings",
};

const FAB_SIZE = 56;

function TabButton({
  routeName,
  isFocused,
  onPress,
}: {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
}) {
  const icons = TAB_ICONS[routeName];
  const label = TAB_LABELS[routeName];
  const color = isFocused ? Colors.tint : Colors.tabIconDefault;
  const iconName = isFocused ? icons.active : icons.inactive;

  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Ionicons name={iconName} size={24} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function FabButton() {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    router.push("/add-movement");
  };

  return (
    <View style={styles.fabContainer}>
      <AnimatedPressable
        style={[styles.fab, animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Ionicons name="add" size={28} color={Colors.background} />
      </AnimatedPressable>
    </View>
  );
}

export default function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const routeNames = state.routes.map((route) => route.name);

  // Find the index where we insert the FAB (after the second tab)
  const firstHalf = routeNames.slice(0, 2);
  const secondHalf = routeNames.slice(2);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {firstHalf.map((routeName) => {
        const routeIndex = routeNames.indexOf(routeName);
        const isFocused = state.index === routeIndex;

        return (
          <TabButton
            key={routeName}
            routeName={routeName}
            isFocused={isFocused}
            onPress={() => navigation.navigate(routeName)}
          />
        );
      })}

      <FabButton />

      {secondHalf.map((routeName) => {
        const routeIndex = routeNames.indexOf(routeName);
        const isFocused = state.index === routeIndex;

        return (
          <TabButton
            key={routeName}
            routeName={routeName}
            isFocused={isFocused}
            onPress={() => navigation.navigate(routeName)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  tabLabel: {
    fontSize: Typography.tabLabel.fontSize,
    fontWeight: Typography.tabLabel.fontWeight,
  },
  fabContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
