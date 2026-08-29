import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, Heart, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, CATEGORY_COLORS } from '@/data/furniture';
import { FurnitureItem } from '@/types';
import { FurnitureCard } from '@/components/FurnitureCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BottomSheet } from '@/components/BottomSheet';
import { ColorPicker } from '@/components/ColorPicker';
import { useFloorPlan } from '@/contexts/FloorPlanContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;

const STYLE_COLLECTIONS = [
  { id: 'modern', name: 'Modern Minimalist', count: 45, gradient: ['#1a2a4a', '#2563EB'], emoji: '🛋️🪴🖼️' },
  { id: 'scandinavian', name: 'Scandinavian Cozy', count: 38, gradient: ['#1a3a2a', '#059669'], emoji: '🛏️🕯️🌿' },
  { id: 'industrial', name: 'Industrial Loft', count: 32, gradient: ['#2a1a0a', '#92400E'], emoji: '💡🪑🔩' },
  { id: 'bohemian', name: 'Bohemian Chic', count: 41, gradient: ['#2a1a3a', '#7C3AED'], emoji: '🪴🏺🧶' },
  { id: 'classic', name: 'Classic Elegance', count: 29, gradient: ['#1a1a2a', '#4F8EF7'], emoji: '🕐🪞✨' },
];

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return (
    <Animated.View style={[styles.skeleton, { opacity }]} />
  );
}

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useFloorPlan();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FurnitureItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStyle, setFilterStyle] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    let items = FURNITURE_CATALOG;
    if (activeCategory !== 'all') {
      items = items.filter(i => i.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterStyle) {
      items = items.filter(i => i.style.includes(filterStyle));
    }
    return items;
  }, [activeCategory, search, filterStyle]);

  const handleItemPress = useCallback((item: FurnitureItem) => {
    console.log('[Catalog] Item pressed:', item.id);
    setSelectedItem(item);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: FurnitureItem; index: number }) => (
    <View style={{ width: CARD_W }}>
      <FurnitureCard
        item={item}
        isFavorite={favorites.includes(item.id)}
        onToggleFavorite={() => toggleFavorite(item.id)}
        onPress={() => handleItemPress(item)}
        index={index}
      />
    </View>
  ), [favorites, toggleFavorite, handleItemPress]);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [headerOpacity]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={styles.headerTitle}>Furniture & Decor</Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[Catalog] Open filter');
            setShowFilter(true);
          }}
          style={[styles.filterBtn, filterStyle && styles.filterBtnActive]}
        >
          <SlidersHorizontal size={18} color={filterStyle ? COLORS.primary : COLORS.text} />
        </AnimatedPressable>
      </Animated.View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={18} color={COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search 200+ items..."
          placeholderTextColor={COLORS.textTertiary}
          value={search}
          onChangeText={text => {
            console.log('[Catalog] Search:', text);
            setSearch(text);
          }}
        />
        {search.length > 0 && (
          <AnimatedPressable onPress={() => setSearch('')}>
            <X size={16} color={COLORS.textTertiary} />
          </AnimatedPressable>
        )}
      </View>

      <FlatList
        data={loading ? [] : filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Style Collections */}
            <Text style={styles.sectionTitle}>Style Collections</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collectionsScroll}>
              <View style={styles.collectionsRow}>
                {STYLE_COLLECTIONS.map(col => (
                  <AnimatedPressable
                    key={col.id}
                    onPress={() => {
                      console.log('[Catalog] Style collection:', col.id);
                      setFilterStyle(filterStyle === col.id ? null : col.id);
                      setActiveCategory('all');
                    }}
                    style={[
                      styles.collectionCard,
                      { backgroundColor: col.gradient[0] },
                      filterStyle === col.id && { borderColor: COLORS.primary, borderWidth: 2 },
                    ]}
                  >
                    <Text style={styles.collectionEmoji}>{col.emoji}</Text>
                    <Text style={styles.collectionName}>{col.name}</Text>
                    <Text style={styles.collectionCount}>{col.count} items</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </ScrollView>

            {/* Category Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <View style={styles.catRow}>
                {FURNITURE_CATEGORIES.map(cat => {
                  const isActive = activeCategory === cat.id;
                  const color = cat.id === 'all' ? COLORS.primary : (CATEGORY_COLORS[cat.id] ?? COLORS.primary);
                  return (
                    <AnimatedPressable
                      key={cat.id}
                      onPress={() => {
                        console.log('[Catalog] Category:', cat.id);
                        setActiveCategory(cat.id);
                      }}
                      style={[
                        styles.catChip,
                        isActive && { backgroundColor: color + '22', borderColor: color },
                      ]}
                    >
                      <Text style={styles.catEmoji}>{cat.emoji}</Text>
                      <Text style={[styles.catLabel, isActive && { color }]}>{cat.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.countText}>
              {loading ? 'Loading...' : `${filtered.length} items`}
            </Text>

            {/* Skeleton */}
            {loading && (
              <View style={styles.skeletonGrid}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </View>
            )}
          </View>
        }
      />

      {/* Filter Sheet */}
      <BottomSheet visible={showFilter} onClose={() => setShowFilter(false)} maxHeight={400}>
        <View style={styles.filterContent}>
          <Text style={styles.filterTitle}>Filter</Text>

          <Text style={styles.filterLabel}>Style</Text>
          <View style={styles.filterChips}>
            {['modern', 'scandinavian', 'industrial', 'bohemian', 'minimalist', 'classic'].map(s => (
              <AnimatedPressable
                key={s}
                onPress={() => {
                  console.log('[Catalog] Filter style:', s);
                  setFilterStyle(filterStyle === s ? null : s);
                }}
                style={[
                  styles.filterChip,
                  filterStyle === s && { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
                ]}
              >
                <Text style={[styles.filterChipText, filterStyle === s && { color: COLORS.primary }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <AnimatedPressable
            onPress={() => {
              console.log('[Catalog] Clear filters');
              setFilterStyle(null);
              setShowFilter(false);
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear Filters</Text>
          </AnimatedPressable>
        </View>
      </BottomSheet>

      {/* Item Detail Sheet */}
      <BottomSheet visible={!!selectedItem} onClose={() => setSelectedItem(null)} maxHeight={480}>
        {selectedItem && (
          <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailEmoji, { backgroundColor: (CATEGORY_COLORS[selectedItem.category] ?? COLORS.primary) + '22' }]}>
              <Text style={styles.detailEmojiText}>{selectedItem.emoji}</Text>
            </View>
            <Text style={styles.detailName}>{selectedItem.name}</Text>
            <Text style={styles.detailCategory}>{selectedItem.category} · {selectedItem.subcategory}</Text>

            <View style={styles.detailDims}>
              <View style={styles.detailDim}>
                <Text style={styles.detailDimValue}>{selectedItem.width}</Text>
                <Text style={styles.detailDimLabel}>Width (cm)</Text>
              </View>
              <View style={styles.detailDimDivider} />
              <View style={styles.detailDim}>
                <Text style={styles.detailDimValue}>{selectedItem.depth}</Text>
                <Text style={styles.detailDimLabel}>Depth (cm)</Text>
              </View>
              <View style={styles.detailDimDivider} />
              <View style={styles.detailDim}>
                <Text style={styles.detailDimValue}>{selectedItem.height}</Text>
                <Text style={styles.detailDimLabel}>Height (cm)</Text>
              </View>
            </View>

            <Text style={styles.detailLabel}>Available Colors</Text>
            <ColorPicker
              colors={selectedItem.colors}
              onSelect={color => console.log('[Catalog] Preview color:', color)}
              size={36}
            />

            <Text style={styles.detailLabel}>Style Tags</Text>
            <View style={styles.styleTags}>
              {selectedItem.style.map(s => (
                <View key={s} style={styles.styleTag}>
                  <Text style={styles.styleTagText}>{s}</Text>
                </View>
              ))}
            </View>

            <AnimatedPressable
              onPress={() => {
                console.log('[Catalog] Toggle favorite from detail:', selectedItem.id);
                toggleFavorite(selectedItem.id);
              }}
              style={[
                styles.favBtn,
                favorites.includes(selectedItem.id) && styles.favBtnActive,
              ]}
            >
              <Heart
                size={18}
                color={favorites.includes(selectedItem.id) ? COLORS.danger : COLORS.text}
                fill={favorites.includes(selectedItem.id) ? COLORS.danger : 'none'}
              />
              <Text style={[
                styles.favBtnText,
                favorites.includes(selectedItem.id) && { color: COLORS.danger },
              ]}>
                {favorites.includes(selectedItem.id) ? 'Saved to Favorites' : 'Add to Favorites'}
              </Text>
            </AnimatedPressable>
          </ScrollView>
        )}
      </BottomSheet>
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
    paddingVertical: 16,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 160,
    gap: 12,
  },
  row: {
    gap: 12,
    justifyContent: 'space-between',
  },
  listHeader: {
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  collectionsScroll: {
    marginHorizontal: -16,
  },
  collectionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  collectionCard: {
    width: 150,
    height: 110,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'flex-end',
    gap: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  collectionEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  collectionName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  collectionCount: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  catScroll: {
    marginHorizontal: -16,
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catEmoji: {
    fontSize: 14,
  },
  catLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  countText: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skeleton: {
    width: CARD_W,
    height: 180,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSecondary,
  },
  // Filter
  filterContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  filterTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  filterLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  clearBtn: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  // Detail
  detailContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  detailEmoji: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailEmojiText: {
    fontSize: 52,
  },
  detailName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailCategory: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  detailDims: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailDim: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  detailDimValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  detailDimLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  detailDimDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
  },
  styleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'flex-start',
  },
  styleTag: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  styleTagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  favBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  favBtnActive: {
    backgroundColor: COLORS.danger + '15',
    borderColor: COLORS.danger + '40',
  },
  favBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
