import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface ProgressBarProps {
  totalSteps: number;
  currentStep: number;
}

export function ProgressBar({ totalSteps, currentStep }: ProgressBarProps) {
  if (!totalSteps || totalSteps <= 0) return null;

  const segments = [];
  for (let i = 0; i < totalSteps; i++) {
    segments.push(
      <View
        key={i}
        style={[
          styles.segment,
          {
            backgroundColor: i <= currentStep ? COLORS.accent : COLORS.border,
          },
        ]}
      />,
    );
  }

  const stepLabel = `Step ${currentStep + 1} of ${totalSteps}`;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>{segments}</View>
      <Text style={styles.stepLabel}>{stepLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
  },
  container: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
});
