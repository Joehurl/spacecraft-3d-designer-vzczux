import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Heart, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Recommendation } from '@/utils/recommendationEngine';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAdd: () => void;
  onSave: () => void;
  variant: 'large' | 'medium' | 'small';
  isSaved?: boolean;
  index?: number;
}

const PLACEMENT_LABELS: Record<Recommendation['placement'], string> = {
  corner: 'Fits in corner',
  wall: 'Perfect for wall space',
  center: 'Center placement',
  window: 'Near window',
  general: 'Flexible placement',
};

export function RecommendationCard({
  recommendation,
  onAdd,
  onSave,
  variant,
  isSaved = false,
  index = 0,
}: RecommendationCardProps) {
  const { item, score, reason, placement } = recommendation;

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

  const priceDisplay = item.price !== undefined ? `$${Number(item.price).toLocaleString()}` : null;
  const scoreText = `${score}% match`;
  const placementLabel = PLACEMENT_LABELS[placement];
  const scoreBarWidth = `${score}%` as `${number}%`;

  if (variant === 'large') {
    return (
      <Animated.View style={[{ opacity, transform: [{ translateY }] }]}>
        <View style={styles.largeCard}>
          {/* Top row: emoji + save */}
          <View style={styles.largeTopRow}>
            <View style={styles.largeEmojiWrap}>
              <Text style={styles.largeEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.largeScoreBadge}>
              <Text style={styles.largeScoreText}>{scoreText}</Text>
            </View>
            <AnimatedPressable
              onPress={() => {
                console.log('[RecommendationCard] Save for later:', item.id, item.name);
                onSave();
              }}
              style={[styles.heartBtn, isSaved && styles.heartBtnActive]}
            >
              <Heart
                size={18}
                color={isSaved ? COLORS.danger : COLORS.textSecondary}
                fill={isSaved ? COLORS.danger : 'none'}
              />
            </AnimatedPressable>
          </View>

          {/* Info */}
          <View style={styles.largeInfo}>
            <Text style={styles.largeName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.largeSubcat}>{item.subcategory}</Text>
          </View>

          {/* Score bar */}
          <View style={styles.scoreBarTrack}>
            <View style={[styles.scoreBarFill, { width: scoreBarWidth }]} />
          </View>

          {/* Reason */}
          <View style={styles.reasonRow}>
            <Text style={styles.reasonText} numberOfLines={2}>{reason}</Text>
          </View>

          {/* Placement + price row */}
          <View style={styles.largeMeta}>
            <View style={styles.placementBadge}>
              <Text style={styles.placementText}>{placementLabel}</Text>
            </View>
            {priceDisplay !== null && (
              <Text style={styles.largePrice}>{priceDisplay}</Text>
            )}
          </View>

          {/* Add button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[RecommendationCard] Add to room pressed:', item.id, item.name);
              onAdd();
            }}
            style={styles.addBtnWrap}
          >
            <LinearGradient
              colors={[COLORS.accent, '#00B894']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtn}
            >
              <Plus size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add to Room</Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </Animated.View>
    );
  }

  if (variant === 'medium') {
    return (
      <Animated.View style={[{ opacity, transform: [{ translateY }] }]}>
        <AnimatedPressable
          onPress={() => {
            console.log('[RecommendationCard] Medium card pressed:', item.id, item.name);
            onAdd();
          }}
          style={styles.mediumCard}
        >
          <View style={styles.mediumEmojiWrap}>
            <Text style={styles.mediumEmoji}>{item.emoji}</Text>
          </View>
          <View style={styles.mediumStyleBadge}>
            <Text style={styles.mediumStyleText}>{item.style[0]} ✓</Text>
          </View>
          <Text style={styles.mediumName} numberOfLines={2}>{item.name}</Text>
          {priceDisplay !== null && (
            <Text style={styles.mediumPrice}>{priceDisplay}</Text>
          )}
          <View style={styles.mediumScoreRow}>
            <View style={[styles.mediumScoreBar, { width: `${score}%` as `${number}%` }]} />
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  // small
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }]}>
      <AnimatedPressable
        onPress={() => {
          console.log('[RecommendationCard] Small card pressed:', item.id, item.name);
          onAdd();
        }}
        style={styles.smallCard}
      >
        <Text style={styles.smallEmoji}>{item.emoji}</Text>
        <View style={styles.smallInfo}>
          <Text style={styles.smallName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.smallMeta} numberOfLines={1}>{placementLabel}</Text>
          <Text style={styles.smallDims}>{item.width}×{item.depth}cm</Text>
        </View>
        {priceDisplay !== null && (
          <Text style={styles.smallPrice}>{priceDisplay}</Text>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Large card
  largeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  largeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  largeEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  largeEmoji: {
    fontSize: 32,
  },
  largeScoreBadge: {
    flex: 1,
    backgroundColor: COLORS.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  largeScoreText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  heartBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heartBtnActive: {
    backgroundColor: COLORS.danger + '15',
    borderColor: COLORS.danger + '40',
  },
  largeInfo: {
    gap: 2,
  },
  largeName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  largeSubcat: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  scoreBarTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  reasonRow: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  largeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placementBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  placementText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  largePrice: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  addBtnWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Medium card
  mediumCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  mediumEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediumEmoji: {
    fontSize: 26,
  },
  mediumStyleBadge: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  mediumStyleText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  mediumName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  mediumPrice: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  mediumScoreRow: {
    height: 3,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  mediumScoreBar: {
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },

  // Small card
  smallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  smallEmoji: {
    fontSize: 28,
  },
  smallInfo: {
    flex: 1,
    gap: 2,
  },
  smallName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  smallMeta: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  smallDims: {
    color: COLORS.textTertiary,
    fontSize: 11,
  },
  smallPrice: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
