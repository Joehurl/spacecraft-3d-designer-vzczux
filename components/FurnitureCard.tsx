import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { FurnitureItem } from '@/types';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CATEGORY_COLORS } from '@/data/furniture';

interface FurnitureCardProps {
  item: FurnitureItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
  onAddToRoom?: () => void;
  index: number;
  compact?: boolean;
}

export function FurnitureCard({
  item,
  isFavorite,
  onToggleFavorite,
  onPress,
  onAddToRoom,
  index,
  compact = false,
}: FurnitureCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 50, 400),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: Math.min(index * 50, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const catColor = CATEGORY_COLORS[item.category] ?? COLORS.primary;
  const dimW = String(item.width);
  const dimD = String(item.depth);

  if (compact) {
    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <AnimatedPressable onPress={onPress} style={styles.compactCard}>
          <View style={[styles.compactEmoji, { backgroundColor: catColor + '22' }]}>
            <Text style={styles.compactEmojiText}>{item.emoji}</Text>
          </View>
          <Text style={styles.compactName} numberOfLines={2}>{item.name}</Text>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={onPress} style={styles.card}>
        {/* Emoji area */}
        <View style={[styles.emojiArea, { backgroundColor: catColor + '18' }]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[FurnitureCard] Toggle favorite:', item.id);
              onToggleFavorite();
            }}
            style={styles.heartBtn}
          >
            <Heart
              size={18}
              color={isFavorite ? '#EF4444' : COLORS.textTertiary}
              fill={isFavorite ? '#EF4444' : 'none'}
            />
          </AnimatedPressable>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.dims}>{dimW} × {dimD} cm</Text>
          <View style={styles.footer}>
            <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
              <Text style={[styles.catText, { color: catColor }]}>{item.category}</Text>
            </View>
            {onAddToRoom && (
              <AnimatedPressable
                onPress={() => {
                  console.log('[FurnitureCard] Add to room:', item.id);
                  onAddToRoom();
                }}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>+ Add</Text>
              </AnimatedPressable>
            )}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  emojiArea: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 44,
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 10,
    gap: 4,
  },
  name: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  dims: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  catBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addBtn: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  // Compact
  compactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactEmoji: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactEmojiText: {
    fontSize: 28,
  },
  compactName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
});
