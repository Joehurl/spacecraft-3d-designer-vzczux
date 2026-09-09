import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FurnitureItem } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;

type SortOption = 'popular' | 'price_asc' | 'price_desc' | 'az';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'price_asc', label: 'Price ↑' },
  { id: 'price_desc', label: 'Price ↓' },
  { id: 'az', label: 'A→Z' },
];

function WishlistCard({
  item,
  onRemove,
}: {
  item: FurnitureItem;
  onRemove: () => void;
}) {
  const priceText = item.price !== undefined ? `$${Number(item.price).toLocaleString()}` : 'Price on request';
  const hasBrand = !!item.brand;

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.emojiWrap}>
        <Text style={cardStyles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={cardStyles.name} numberOfLines={2}>{item.name}</Text>
      {hasBrand && (
        <Text style={cardStyles.brand} numberOfLines={1}>{item.brand}</Text>
      )}
      <Text style={cardStyles.price}>{priceText}</Text>
      <AnimatedPressable
        onPress={onRemove}
        style={cardStyles.heartBtn}
      >
        <Heart size={16} color={COLORS.danger} fill={COLORS.danger} />
      </AnimatedPressable>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    position: 'relative',
  },
  emojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 30,
  },
  name: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  brand: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  price: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.danger + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
});

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useFloorPlan();

  const [sortBy, setSortBy] = useState<SortOption>('popular');

  const wishlistItems = useMemo(() => {
    const items = favorites
      .map(id => FURNITURE_CATALOG.find(f => f.id === id))
      .filter(Boolean) as FurnitureItem[];

    const sorted = [...items];
    if (sortBy === 'popular') {
      sorted.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
    } else if (sortBy === 'az') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'price_asc') {
      sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    }
    return sorted;
  }, [favorites, sortBy]);

  const totalCost = useMemo(() => {
    return wishlistItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
  }, [wishlistItems]);

  const handleRemove = useCallback((itemId: string) => {
    console.log('[Wishlist] Remove item from wishlist:', itemId);
    toggleFavorite(itemId);
  }, [toggleFavorite]);

  const handleSortPress = useCallback((opt: SortOption) => {
    console.log('[Wishlist] Sort by:', opt);
    setSortBy(opt);
  }, []);

  const itemCount = wishlistItems.length;
  const totalCostDisplay = `$${totalCost.toLocaleString()}`;

  const renderItem = useCallback(({ item }: { item: FurnitureItem }) => (
    <WishlistCard
      item={item}
      onRemove={() => handleRemove(item.id)}
    />
  ), [handleRemove]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Wishlist</Text>
          {itemCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{itemCount}</Text>
            </View>
          )}
        </View>
        <AnimatedPressable
          onPress={() => {
            console.log('[Wishlist] Close pressed');
            router.back();
          }}
          style={styles.closeBtn}
        >
          <X size={20} color={COLORS.text} />
        </AnimatedPressable>
      </View>

      {/* Sort Bar */}
      {itemCount > 0 && (
        <View style={styles.sortBar}>
          {SORT_OPTIONS.map(opt => {
            const isActive = sortBy === opt.id;
            return (
              <AnimatedPressable
                key={opt.id}
                onPress={() => handleSortPress(opt.id)}
                style={[styles.sortChip, isActive && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      )}

      {/* Total Cost Banner */}
      {itemCount > 0 && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalBannerText}>
            Total:
            <Text style={styles.totalBannerValue}> {totalCostDisplay}</Text>
            <Text style={styles.totalBannerSep}> · </Text>
            <Text style={styles.totalBannerCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          </Text>
        </View>
      )}

      <FlatList
        data={wishlistItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Heart size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptySubtitle}>Heart items in the catalog to save them here</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Wishlist] Browse catalog pressed from empty state');
                router.push('/(tabs)/(catalog)');
              }}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Browse Catalog</Text>
            </AnimatedPressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  sortChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: COLORS.primary,
  },
  totalBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.accentMuted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  totalBannerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  totalBannerValue: {
    color: COLORS.accent,
    fontWeight: '800',
  },
  totalBannerSep: {
    color: COLORS.textTertiary,
  },
  totalBannerCount: {
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  row: {
    gap: 12,
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
