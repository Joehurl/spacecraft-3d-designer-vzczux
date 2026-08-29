import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function ToolButton({ icon, label, active, onPress }: ToolButtonProps) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.btn, active && styles.btnActive]}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    minWidth: 56,
  },
  btnActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
