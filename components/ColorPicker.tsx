import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';

interface ColorPickerProps {
  colors: string[];
  selectedColor?: string;
  onSelect: (color: string) => void;
  size?: number;
}

export function ColorPicker({ colors, selectedColor, onSelect, size = 32 }: ColorPickerProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {colors.map(color => {
        const isSelected = selectedColor === color;
        return (
          <AnimatedPressable
            key={color}
            onPress={() => {
              console.log('[ColorPicker] Selected color:', color);
              onSelect(color);
            }}
            style={[
              styles.swatch,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                borderWidth: isSelected ? 2 : 1.5,
                borderColor: isSelected ? COLORS.primary : 'rgba(255,255,255,0.2)',
              },
            ]}
          >
            {isSelected && (
              <Check size={size * 0.45} color="#fff" strokeWidth={3} />
            )}
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  swatch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
