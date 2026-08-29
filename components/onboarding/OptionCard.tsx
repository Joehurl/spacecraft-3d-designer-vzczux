import React, { useRef, useCallback } from 'react';
import { Pressable, Text, View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface OptionCardProps {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionCard({ emoji, label, selected, onPress }: OptionCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  const borderColor = selected ? COLORS.accent : COLORS.border;
  const bgColor = selected ? 'rgba(0,212,170,0.08)' : COLORS.surface;
  const checkmark = selected ? '✓' : '';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: bgColor,
            borderColor: borderColor,
          },
        ]}
      >
        <View style={styles.left}>
          <View style={[styles.emojiBox, { backgroundColor: selected ? 'rgba(0,212,170,0.15)' : COLORS.surfaceSecondary }]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <Text style={[styles.label, { color: COLORS.text }]}>{label}</Text>
        </View>
        <View style={[styles.checkCircle, { borderColor: selected ? COLORS.accent : COLORS.textTertiary, backgroundColor: selected ? COLORS.accent : 'transparent' }]}>
          <Text style={[styles.checkText, { color: selected ? '#000' : 'transparent' }]}>{checkmark}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
});
