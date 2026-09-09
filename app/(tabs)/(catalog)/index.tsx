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
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, Heart, X, ChevronDown, Sparkles, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, CATEGORY_COLORS } from '@/data/furniture';
import { FURNITURE_COLLECTIONS, FurnitureCollection } from '@/data/collections';
import { FurnitureItem } from '@/types';
import { FurnitureCard } from '@/components/FurnitureCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BottomSheet } from '@/components/BottomSheet';
import { ColorPicker } from '@/components/ColorPicker';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { generateRecommendations } from '@/utils/recommendationEngine';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;

type SortOption = 'popular' | 'az' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'popular', label: 'Popular First' },
  { id: 'az', label: 'A → Z' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
];

const STYLE_FILTERS = ['modern', 'scandinavian', 'industrial', 'bohemian', 'minimalist', 'classic'];

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
  return <Animated.View style={[styles.skeleton, { opacity }]} />;
}

function CollectionCard({
  collection,
  isActive,
  onPress,
}: {
  collection: FurnitureCollection;
  isActive: boolean;
  onPress: () => void;
}) {
  const gradientStart = collection.color + 'CC';
  const gradientEnd = collection.color + '44';
  return (
    <AnimatedPressable onPress={onPress} style={[styles.collectionCard, isActive && styles.collectionCardActive]}>
      <LinearGradient
        colors={[gradientStart, gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.collectionGradient}
      >
        <Text style={styles.collectionEmoji}>{collection.emoji}</Text>
        <View style={styles.collectionInfo}>
          <Text style={styles.collectionName} numberOfLines={1}>{collection.name}</Text>
          <View style={styles.collectionBrandRow}>
            <Text style={styles.collectionBrand} numberOfLines={1}>{collection.brand}</Text>
          </View>
        </View>
        {isActive && (
          <View style={styles.collectionActiveDot} />
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite, projects } = useFloorPlan();

  // Recommended for You — based on most recently edited project
  const catalogRecommendations = useMemo(() => {
    const sorted = [...projects].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const latestProject = sorted[0];
    if (!latestProject || latestProject.rooms.length === 0) return [];
    const room = latestProject.rooms[0];
    const recs = generateRecommendations(room, latestProject);
    return recs.slice(0, 4).map(r => r.item);
  }, [projects]);

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FurnitureItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStyle, setFilterStyle] = useState<string | null>(null);
  const [filterPopular, setFilterPopular] = useState(false);
  const [filterNew, setFilterNew] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  const searchScaleAnim = useRef(new Animated.Value(1)).current;

  const handleSearchFocus = useCallback(() => {
    console.log('[Catalog] Search input focused');
    setSearchFocused(true);
    Animated.timing(searchScaleAnim, { toValue: 1.01, duration: 150, useNativeDriver: true }).start();
  }, [searchScaleAnim]);

  const handleSearchBlur = useCallback(() => {
    console.log('[Catalog] Search input blurred');
    setSearchFocused(false);
    Animated.timing(searchScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [searchScaleAnim]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const collectionItemIds = useMemo(() => {
    if (!activeCollection) return null;
    const col = FURNITURE_COLLECTIONS.find(c => c.id === activeCollection);
    return col ? new Set(col.itemIds) : null;
  }, [activeCollection]);

  const filtered = useMemo(() => {
    let items = FURNITURE_CATALOG;

    if (collectionItemIds) {
      items = items.filter(i => collectionItemIds.has(i.id));
    }
    if (activeCategory !== 'all') {
      items = items.filter(i => i.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.subcategory.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)) ||
        i.style.some(s => s.toLowerCase().includes(q))
      );
    }
    if (filterStyle) {
      items = items.filter(i => i.style.includes(filterStyle));
    }
    if (filterPopular) {
      items = items.filter(i => i.popular);
    }
    if (filterNew) {
      items = items.filter(i => i.isNew === true);
    }

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
  }, [activeCategory, search, filterStyle, filterPopular, filterNew, collectionItemIds, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: FURNITURE_CATALOG.length };
    FURNITURE_CATALOG.forEach(item => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    });
    return counts;
  }, []);

  const similarItems = useMemo(() => {
    if (!selectedItem) return [];
    return FURNITURE_CATALOG
      .filter(i => i.subcategory === selectedItem.subcategory && i.id !== selectedItem.id)
      .slice(0, 3);
  }, [selectedItem]);

  const activeFilterCount = [filterStyle, filterPopular, filterNew].filter(Boolean).length;

  const handleItemPress = useCallback((item: FurnitureItem) => {
    console.log('[Catalog] Item pressed:', item.id, item.name);
    setSelectedItem(item);
  }, []);

  const handleCollectionPress = useCallback((collectionId: string) => {
    const isDeselecting = activeCollection === collectionId;
    console.log('[Catalog] Collection pressed:', collectionId, isDeselecting ? '(deselect)' : '(select)');
    setActiveCollection(isDeselecting ? null : collectionId);
    setActiveCategory('all');
  }, [activeCollection]);

  const handleCategoryPress = useCallback((catId: string) => {
    console.log('[Catalog] Category pressed:', catId);
    setActiveCategory(catId);
    setActiveCollection(null);
  }, []);

  const handleSortSelect = useCallback((option: SortOption) => {
    console.log('[Catalog] Sort selected:', option);
    setSortBy(option);
    setShowSort(false);
  }, []);

  const handleToggleFavorite = useCallback((itemId: string) => {
    console.log('[Catalog] Toggle favorite:', itemId);
    toggleFavorite(itemId);
  }, [toggleFavorite]);

  const renderItem = useCallback(({ item, index }: { item: FurnitureItem; index: number }) => (
    <View style={{ width: CARD_W }}>
      <FurnitureCard
        item={item}
        isFavorite={favorites.includes(item.id)}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
        onPress={() => handleItemPress(item)}
        index={index}
      />
    </View>
  ), [favorites, handleToggleFavorite, handleItemPress]);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [headerOpacity]);

  const activeSortLabel = SORT_OPTIONS.find(o => o.id === sortBy)?.label ?? 'Sort';

  const selectedItemPrice = selectedItem?.price;
  const priceDisplay = selectedItemPrice !== undefined ? `$${selectedItemPrice.toLocaleString()}` : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View>
          <Text style={styles.headerTitle}>Furniture & Decor</Text>
          <Text style={styles.headerSubtitle}>{FURNITURE_CATALOG.length}+ items</Text>
        </View>
        <View style={styles.headerActions}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Catalog] Open sort menu');
              setShowSort(true);
            }}
            style={styles.sortBtn}
          >
            <ChevronDown size={14} color={COLORS.textSecondary} />
            <Text style={styles.sortBtnText} numberOfLines={1}>{activeSortLabel}</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Catalog] Open filter sheet');
              setShowFilter(true);
            }}
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          >
            <SlidersHorizontal size={18} color={activeFilterCount > 0 ? COLORS.primary : COLORS.text} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </AnimatedPressable>
        </View>
      </Animated.View>

      {/* Search */}
      <Animated.View
        style={[
          styles.searchWrap,
          {
            borderColor: searchFocused ? COLORS.primary : COLORS.border,
            transform: [{ scale: searchScaleAnim }],
          },
        ]}
      >
        <Search size={18} color={searchFocused ? COLORS.primary : COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${FURNITURE_CATALOG.length}+ items...`}
          placeholderTextColor={COLORS.textTertiary}
          value={search}
          onChangeText={text => {
            console.log('[Catalog] Search query:', text);
            setSearch(text);
          }}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
        />
        {search.length > 0 && (
          <AnimatedPressable onPress={() => {
            console.log('[Catalog] Clear search');
            setSearch('');
          }}>
            <X size={16} color={COLORS.textTertiary} />
          </AnimatedPressable>
        )}
      </Animated.View>

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
            {/* Recommended for You */}
            {catalogRecommendations.length > 0 && (
              <View style={styles.recForYouSection}>
                <View style={styles.recForYouHeader}>
                  <Sparkles size={15} color={COLORS.accent} />
                  <Text style={styles.recForYouTitle}>Recommended for You</Text>
                </View>
                <Text style={styles.recForYouSubtitle}>Based on your latest project</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recForYouScroll}
                >
                  {catalogRecommendations.map(item => (
                    <AnimatedPressable
                      key={item.id}
                      onPress={() => {
                        console.log('[Catalog] Recommended item pressed:', item.id, item.name);
                        handleItemPress(item);
                      }}
                      style={styles.recForYouCard}
                    >
                      <View style={[styles.recForYouEmoji, { backgroundColor: (CATEGORY_COLORS[item.category] ?? COLORS.primary) + '22' }]}>
                        <Text style={styles.recForYouEmojiText}>{item.emoji}</Text>
                      </View>
                      <Text style={styles.recForYouName} numberOfLines={2}>{item.name}</Text>
                      {item.price !== undefined && (
                        <Text style={styles.recForYouPrice}>${Number(item.price).toLocaleString()}</Text>
                      )}
                      <View style={styles.recForYouBadge}>
                        <Text style={styles.recForYouBadgeText}>For you</Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Collections Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Collections</Text>
              {activeCollection && (
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Catalog] Clear collection filter');
                    setActiveCollection(null);
                  }}
                  style={styles.clearCollectionBtn}
                >
                  <X size={12} color={COLORS.primary} />
                  <Text style={styles.clearCollectionText}>Clear</Text>
                </AnimatedPressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.collectionsScroll}
              contentContainerStyle={styles.collectionsRow}
            >
              {FURNITURE_COLLECTIONS.map(col => (
                <CollectionCard
                  key={col.id}
                  collection={col}
                  isActive={activeCollection === col.id}
                  onPress={() => handleCollectionPress(col.id)}
                />
              ))}
            </ScrollView>

            {/* Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catRow}
            >
              {FURNITURE_CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id && !activeCollection;
                const color = cat.id === 'all' ? COLORS.primary : (CATEGORY_COLORS[cat.id] ?? COLORS.primary);
                const count = categoryCounts[cat.id] ?? 0;
                return (
                  <AnimatedPressable
                    key={cat.id}
                    onPress={() => handleCategoryPress(cat.id)}
                    style={[
                      styles.catChip,
                      isActive && { backgroundColor: color + '22', borderColor: color },
                    ]}
                  >
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.catLabel, isActive && { color }]}>{cat.label}</Text>
                    <View style={[styles.catBadge, isActive && { backgroundColor: color + '33' }]}>
                      <Text style={[styles.catBadgeText, isActive && { color }]}>{count}</Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {/* Quick Filters Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickFiltersRow}
            >
              <AnimatedPressable
                onPress={() => {
                  console.log('[Catalog] Toggle popular filter:', !filterPopular);
                  setFilterPopular(p => !p);
                }}
                style={[styles.quickChip, filterPopular && styles.quickChipActive]}
              >
                <TrendingUp size={12} color={filterPopular ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.quickChipText, filterPopular && { color: COLORS.primary }]}>Popular</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Catalog] Toggle new filter:', !filterNew);
                  setFilterNew(n => !n);
                }}
                style={[styles.quickChip, filterNew && styles.quickChipActive]}
              >
                <Sparkles size={12} color={filterNew ? COLORS.accent : COLORS.textSecondary} />
                <Text style={[styles.quickChipText, filterNew && { color: COLORS.accent }]}>New</Text>
              </AnimatedPressable>
              {STYLE_FILTERS.map(s => (
                <AnimatedPressable
                  key={s}
                  onPress={() => {
                    console.log('[Catalog] Quick style filter:', s);
                    setFilterStyle(prev => prev === s ? null : s);
                  }}
                  style={[styles.quickChip, filterStyle === s && styles.quickChipActive]}
                >
                  <Text style={[styles.quickChipText, filterStyle === s && { color: COLORS.primary }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </AnimatedPressable>
              ))}
            </ScrollView>

            {/* Result Count */}
            <Text style={styles.countText}>
              {loading ? 'Loading...' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}${activeCollection ? ` in collection` : ''}`}
            </Text>

            {/* Skeleton */}
            {loading && (
              <View style={styles.skeletonGrid}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Search size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Catalog] Clear all filters from empty state');
                  setSearch('');
                  setFilterStyle(null);
                  setFilterPopular(false);
                  setFilterNew(false);
                  setActiveCollection(null);
                  setActiveCategory('all');
                }}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Clear all filters</Text>
              </AnimatedPressable>
            </View>
          ) : null
        }
      />

      {/* Sort Sheet */}
      <BottomSheet visible={showSort} onClose={() => setShowSort(false)} maxHeight={320}>
        <View style={styles.filterContent}>
          <Text style={styles.filterTitle}>Sort by</Text>
          {SORT_OPTIONS.map(opt => (
            <AnimatedPressable
              key={opt.id}
              onPress={() => handleSortSelect(opt.id)}
              style={[styles.sortOption, sortBy === opt.id && styles.sortOptionActive]}
            >
              <Text style={[styles.sortOptionText, sortBy === opt.id && { color: COLORS.primary }]}>
                {opt.label}
              </Text>
              {sortBy === opt.id && (
                <View style={styles.sortOptionCheck} />
              )}
            </AnimatedPressable>
          ))}
        </View>
      </BottomSheet>

      {/* Filter Sheet */}
      <BottomSheet visible={showFilter} onClose={() => setShowFilter(false)} maxHeight={440}>
        <View style={styles.filterContent}>
          <Text style={styles.filterTitle}>Filter</Text>

          <Text style={styles.filterLabel}>Quick Filters</Text>
          <View style={styles.filterChips}>
            <AnimatedPressable
              onPress={() => {
                console.log('[Catalog] Filter sheet: toggle popular');
                setFilterPopular(p => !p);
              }}
              style={[styles.filterChip, filterPopular && styles.filterChipActive]}
            >
              <TrendingUp size={13} color={filterPopular ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.filterChipText, filterPopular && { color: COLORS.primary }]}>Popular</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => {
                console.log('[Catalog] Filter sheet: toggle new');
                setFilterNew(n => !n);
              }}
              style={[styles.filterChip, filterNew && { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accent }]}
            >
              <Sparkles size={13} color={filterNew ? COLORS.accent : COLORS.textSecondary} />
              <Text style={[styles.filterChipText, filterNew && { color: COLORS.accent }]}>New Arrivals</Text>
            </AnimatedPressable>
          </View>

          <Text style={styles.filterLabel}>Style</Text>
          <View style={styles.filterChips}>
            {STYLE_FILTERS.map(s => (
              <AnimatedPressable
                key={s}
                onPress={() => {
                  console.log('[Catalog] Filter sheet: style:', s);
                  setFilterStyle(filterStyle === s ? null : s);
                }}
                style={[
                  styles.filterChip,
                  filterStyle === s && styles.filterChipActive,
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
              console.log('[Catalog] Clear all filters');
              setFilterStyle(null);
              setFilterPopular(false);
              setFilterNew(false);
              setShowFilter(false);
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear All Filters</Text>
          </AnimatedPressable>
        </View>
      </BottomSheet>

      {/* Item Detail Sheet */}
      <BottomSheet visible={!!selectedItem} onClose={() => setSelectedItem(null)} maxHeight={600}>
        {selectedItem && (
          <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailEmoji, { backgroundColor: (CATEGORY_COLORS[selectedItem.category] ?? COLORS.primary) + '22' }]}>
              <Text style={styles.detailEmojiText}>{selectedItem.emoji}</Text>
              {selectedItem.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>

            <Text style={styles.detailName}>{selectedItem.name}</Text>
            <Text style={styles.detailCategory}>{selectedItem.category} · {selectedItem.subcategory}</Text>

            {priceDisplay !== null && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Starting from</Text>
                <Text style={styles.priceValue}>{priceDisplay}</Text>
              </View>
            )}

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
              onSelect={color => console.log('[Catalog] Preview color selected:', color, 'for item:', selectedItem.id)}
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

            {similarItems.length > 0 && (
              <>
                <Text style={styles.detailLabel}>View Similar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarScroll}>
                  <View style={styles.similarRow}>
                    {similarItems.map(sim => (
                      <AnimatedPressable
                        key={sim.id}
                        onPress={() => {
                          console.log('[Catalog] View similar item:', sim.id, sim.name);
                          setSelectedItem(sim);
                        }}
                        style={styles.similarCard}
                      >
                        <View style={[styles.similarEmoji, { backgroundColor: (CATEGORY_COLORS[sim.category] ?? COLORS.primary) + '22' }]}>
                          <Text style={styles.similarEmojiText}>{sim.emoji}</Text>
                        </View>
                        <Text style={styles.similarName} numberOfLines={2}>{sim.name}</Text>
                        {sim.price !== undefined && (
                          <Text style={styles.similarPrice}>${sim.price.toLocaleString()}</Text>
                        )}
                      </AnimatedPressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <AnimatedPressable
              onPress={() => {
                console.log('[Catalog] Toggle favorite from detail sheet:', selectedItem.id, selectedItem.name);
                handleToggleFavorite(selectedItem.id);
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

            <AnimatedPressable
              onPress={() => {
                console.log('[Catalog] Add to shopping list:', selectedItem.id, selectedItem.name);
              }}
              style={styles.shoppingBtn}
            >
              <Text style={styles.shoppingBtnText}>+ Add to Shopping List</Text>
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
    paddingVertical: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 130,
  },
  sortBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
    gap: 10,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  clearCollectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.primaryMuted,
  },
  clearCollectionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  collectionsScroll: {
    marginHorizontal: -16,
  },
  collectionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  collectionCard: {
    width: 160,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  collectionCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  collectionGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
    gap: 4,
  },
  collectionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  collectionInfo: {
    gap: 2,
  },
  collectionName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  collectionBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionBrand: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '500',
  },
  collectionActiveDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: '#fff',
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catEmoji: {
    fontSize: 13,
  },
  catLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  catBadge: {
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  catBadgeText: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '600',
  },
  quickFiltersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  quickChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  countText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 2,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Recommended for You section
  recForYouSection: {
    gap: 8,
    marginTop: 4,
  },
  recForYouHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recForYouTitle: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  recForYouSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: -4,
  },
  recForYouScroll: {
    gap: 10,
    paddingRight: 4,
  },
  recForYouCard: {
    width: 120,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  recForYouEmoji: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recForYouEmojiText: {
    fontSize: 28,
  },
  recForYouName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  recForYouPrice: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  recForYouBadge: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recForYouBadgeText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Sort sheet
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sortOptionActive: {
    // highlighted row
  },
  sortOptionText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  sortOptionCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  // Filter sheet
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
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
  // Detail sheet
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
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  priceRow: {
    alignItems: 'center',
    gap: 2,
  },
  priceLabel: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
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
  similarScroll: {
    alignSelf: 'stretch',
  },
  similarRow: {
    flexDirection: 'row',
    gap: 10,
  },
  similarCard: {
    width: 100,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  similarEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  similarEmojiText: {
    fontSize: 26,
  },
  similarName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  similarPrice: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
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
  shoppingBtn: {
    width: '100%',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  shoppingBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
