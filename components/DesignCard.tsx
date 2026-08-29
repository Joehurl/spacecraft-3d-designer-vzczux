import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Heart, ArrowRight } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface DesignCardProps {
  title: string;
  designer: string;
  roomType: string;
  style: string;
  likes: number;
  gradient: string[];
  emojis: string;
  onUseLayout: () => void;
  index: number;
}

export function DesignCard({
  title,
  designer,
  roomType,
  style,
  likes,
  gradient,
  emojis,
  onUseLayout,
  index,
}: DesignCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const likesDisplay = likes >= 1000 ? `${(likes / 1000).toFixed(1)}k` : String(likes);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View style={styles.card}>
        {/* Visual */}
        <View style={[styles.visual, { backgroundColor: gradient[0] }]}>
          <View style={[styles.visualOverlay, { backgroundColor: gradient[1] + '80' }]} />
          <Text style={styles.emojiComposition}>{emojis}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.designer}>{designer}</Text>
            </View>
            <View style={styles.likesRow}>
              <Heart size={14} color={COLORS.danger} fill={COLORS.danger} />
              <Text style={styles.likesText}>{likesDisplay}</Text>
            </View>
          </View>

          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{roomType}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: COLORS.accentMuted }]}>
              <Text style={[styles.tagText, { color: COLORS.accent }]}>{style}</Text>
            </View>
          </View>

          <AnimatedPressable onPress={onUseLayout} style={styles.useBtn}>
            <Text style={styles.useBtnText}>Use this layout</Text>
            <ArrowRight size={14} color={COLORS.primary} />
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
  },
  visual: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  visualOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  emojiComposition: {
    fontSize: 48,
    letterSpacing: 4,
  },
  content: {
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  designer: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    paddingVertical: 10,
  },
  useBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
