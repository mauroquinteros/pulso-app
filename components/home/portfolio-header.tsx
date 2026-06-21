import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Spacing, BorderRadius } from '@/constants/layout';
import { Typography } from '@/constants/typography';

export function PortfolioHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={Colors.accent} />
        </View>
        <View>
          <Text style={styles.accountLabel}>CUENTA</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity>
          <Ionicons name="search" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellWrapper}>
          <Ionicons name="notifications" size={22} color={Colors.textPrimary} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  bellWrapper: {
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#4FC3F7',
  },
});
