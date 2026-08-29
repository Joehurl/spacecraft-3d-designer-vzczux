import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, ShoppingCart, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BottomSheet } from '@/components/BottomSheet';
import { RecommendationCard } from '@/components/RecommendationCard';
import { FURNITURE_CATALOG } from '@/data/furniture';
import {
  generateRecommendations,
  getPerfectMatches,
  getStyleMatches,
  getSpaceFills,
  getPopularPicks,
  getBudgetPicks,
  getRoomAreaM2,
  getFloorCoveragePercent,
  Recommendation,
} from '@/utils/recommendationEngine';
import { FurnitureItem } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');

type FilterCategory = 'All' | 'Seating' | 'Tables' | 'Storage' | 'Lighting' | 'Decor';
type PriceFilter = 'Any Price' | 'Under $200' | 'Under $500';

const FILTER_CATEGORIES: FilterCategory[] = ['All', 'Seating', 'Tables', 'Storage', 'Lighting', 'Decor'];
const PRICE_FILTERS: PriceFilter[] = ['Any Price', 'Under $200', 'Under $500'];

const CATEGORY_MAP: Record<FilterCategory, string | null> = {
  All: null,
  Seating: 'seating',
  Tables: 'tables',
  Storage: 'storage',
  Lighting: 'lighting',
  Decor: 'decor',
};

function SkeletonLine({ widthPct = 60, height = 14 }: { widthPct?: number; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  const skeletonWidth = SCREEN_W * (widthPct / 100);
  return (
    <Animated.View
      style={{
        width: skeletonWidth,
        height,
        borderRadius: height / 2,
        backgroundColor: COLORS.surfaceSecondary,
        opacity,
      }}
    />
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

export default function RecommendationsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects, addPlacedItem, favorites, toggleFavorite } = useFloorPlan();

  const [analyzing, setAnalyzing] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('Any Price');
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const project = projects.find(p => p.id === projectId);
  const room = project?.rooms[0];

  // Simulate 1.5s analysis
  useEffect(() => {
    console.log('[Recommendations] Starting room analysis for project:', projectId);
    const t = setTimeout(() => {
      console.log('[Recommendations] Analysis complete');
      setAnalyzing(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [projectId]);

  const allRecs = useMemo(() => {
    if (!room || !project) return [];
    console.log('[Recommendations] Generating recommendations for room:', room.id, 'style:', project.style);
    return generateRecommendations(room, project);
  }, [room, project]);

  const filteredRecs = useMemo(() => {
    let recs = allRecs;
    const catFilter = CATEGORY_MAP[activeFilter];
    if (catFilter) {
      recs = recs.filter(r => r.item.category === catFilter);
    }
    if (priceFilter === 'Under $200') {
      recs = recs.filter(r => (r.item.price ?? Infinity) < 200);
    } else if (priceFilter === 'Under $500') {
      recs = recs.filter(r => (r.item.price ?? Infinity) < 500);
    }
    return recs;
  }, [allRecs, activeFilter, priceFilter]);

  const perfectMatches = useMemo(() => getPerfectMatches(filteredRecs), [filteredRecs]);
  const styleMatches = useMemo(() => getStyleMatches(filteredRecs), [filteredRecs]);
  const spaceFills = useMemo(() => getSpaceFills(filteredRecs), [filteredRecs]);
  const popularPicks = useMemo(() => getPopularPicks(filteredRecs), [filteredRecs]);
  const budgetPicks = useMemo(() => getBudgetPicks(filteredRecs), [filteredRecs]);

  const roomAreaM2 = room ? getRoomAreaM2(room) : 0;
  const coveragePercent = room ? getFloorCoveragePercent(room) : 0;
  const coverageStatus = coveragePercent < 25 ? 'Low' : coveragePercent <= 45 ? '✓ Optimal' : 'High';
  const coverageColor = coveragePercent < 25 ? COLORS.warning : coveragePercent <= 45 ? COLORS.accent : COLORS.danger;
  const styleLabel = project ? project.style.charAt(0).toUpperCase() + project.style.slice(1) : '';
  const coverageBarWidth = `${Math.min(coveragePercent, 100)}%` as `${number}%`;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }, [toastOpacity]);

  const handleAddToRoom = useCallback((rec: Recommendation) => {
    if (!project || !room) return;
    console.log('[Recommendations] Add to room:', rec.item.id, rec.item.name, 'project:', project.id);
    addPlacedItem(project.id, room.id, {
      furnitureId: rec.item.id,
      x: 150 + Math.random() * 100,
      y: 150 + Math.random() * 100,
      rotation: 0,
      scale: 1,
      color: rec.item.colors[0],
    });
    setAddedIds(prev => new Set([...prev, rec.item.id]));
    setSelectedRec(null);
    showToast(`${rec.item.emoji} ${rec.item.name} added to room!`);
  }, [project, room, addPlacedItem, showToast]);

  const handleSaveForLater = useCallback((rec: Recommendation) => {
    console.log('[Recommendations] Save for later (toggle favorite):', rec.item.id, rec.item.name);
    toggleFavorite(rec.item.id);
  }, [toggleFavorite]);

  const handleOpenDetail = useCallback((rec: Recommendation) => {
    console.log('[Recommendations] Open detail sheet:', rec.item.id, rec.item.name);
    setSelectedRec(rec);
  }, []);

  const handleAddToShoppingList = useCallback(() => {
    if (!selectedRec) return;
    console.log('[Recommendations] Navigate to shopping list for item:', selectedRec.item.id);
    setSelectedRec(null);
    router.push({ pathname: '/shopping-list', params: { projectId: project?.id } });
  }, [selectedRec, router, project]);

  const similarItems = useMemo(() => {
    if (!selectedRec) return [];
    return FURNITURE_CATALOG
      .filter(i => i.subcategory === selectedRec.item.subcategory && i.id !== selectedRec.item.id)
      .slice(0, 3);
  }, [selectedRec]);

  const selectedPriceDisplay = selectedRec?.item.price !== undefined
    ? `$${Number(selectedRec.item.price).toLocaleString()}`
    : null;

  if (!project || !room) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorState}>
          <Text style={styles.errorEmoji}>🏠</Text>
          <Text style={styles.errorTitle}>No project found</Text>
          <Text style={styles.errorSubtitle}>Open a project from the editor to get recommendations</Text>
          <AnimatedPressable onPress={() => router.back()} style={styles.errorBtn}>
            <Text style={styles.errorBtnText}>Go back</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>✨ Smart Recommendations</Text>
          <Text style={styles.headerSubtitle}>{allRecs.length} suggestions for your room</Text>
        </View>
        <AnimatedPressable
          onPress={() => {
            console.log('[Recommendations] Close screen');
            router.back();
          }}
          style={styles.closeBtn}
        >
          <X size={20} color={COLORS.text} />
        </AnimatedPressable>
      </View>

      {/* Filter bar — sticky */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarContent}
        >
          {FILTER_CATEGORIES.map(cat => (
            <AnimatedPressable
              key={cat}
              onPress={() => {
                console.log('[Recommendations] Filter category:', cat);
                setActiveFilter(cat);
              }}
              style={[styles.filterChip, activeFilter === cat && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, activeFilter === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </AnimatedPressable>
          ))}
          <View style={styles.filterDivider} />
          {PRICE_FILTERS.map(pf => (
            <AnimatedPressable
              key={pf}
              onPress={() => {
                console.log('[Recommendations] Price filter:', pf);
                setPriceFilter(pf);
              }}
              style={[styles.filterChip, priceFilter === pf && styles.filterChipPrice]}
            >
              <Text style={[styles.filterChipText, priceFilter === pf && styles.filterChipPriceText]}>
                {pf}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Room Analysis Card */}
        <View style={styles.analysisCard}>
          {analyzing ? (
            <View style={styles.analyzingContent}>
              <View style={styles.analyzingRow}>
                <Sparkles size={16} color={COLORS.accent} />
                <Text style={styles.analyzingText}>Analyzing your room...</Text>
              </View>
              <View style={styles.skeletonGroup}>
                <SkeletonLine widthPct={60} height={12} />
                <SkeletonLine widthPct={80} height={10} />
                <SkeletonLine widthPct={45} height={10} />
              </View>
            </View>
          ) : (
            <View style={styles.analysisContent}>
              <View style={styles.analysisTopRow}>
                <View>
                  <Text style={styles.analysisRoomName}>{room.name}</Text>
                  <Text style={styles.analysisStyle}>
                    {styleLabel}
                    {' · '}
                    {roomAreaM2}m²
                  </Text>
                </View>
                <LinearGradient
                  colors={[COLORS.accent + '33', COLORS.primary + '22']}
                  style={styles.analysisBadge}
                >
                  <Text style={styles.analysisBadgeText}>AI Analyzed</Text>
                </LinearGradient>
              </View>

              <View style={styles.coverageRow}>
                <Text style={styles.coverageLabel}>Floor coverage:</Text>
                <Text style={[styles.coverageValue, { color: coverageColor }]}>
                  {coveragePercent}%
                  {' '}
                  {coverageStatus}
                </Text>
              </View>
              <View style={styles.coverageTrack}>
                <Animated.View
                  style={[styles.coverageFill, { width: coverageBarWidth, backgroundColor: coverageColor }]}
                />
              </View>

              <View style={styles.analysisStats}>
                <View style={styles.analysisStat}>
                  <Text style={styles.analysisStatValue}>{room.placedItems.length}</Text>
                  <Text style={styles.analysisStatLabel}>Items placed</Text>
                </View>
                <View style={styles.analysisStatDivider} />
                <View style={styles.analysisStat}>
                  <Text style={styles.analysisStatValue}>{allRecs.length}</Text>
                  <Text style={styles.analysisStatLabel}>Suggestions</Text>
                </View>
                <View style={styles.analysisStatDivider} />
                <View style={styles.analysisStat}>
                  <Text style={styles.analysisStatValue}>{perfectMatches.length}</Text>
                  <Text style={styles.analysisStatLabel}>Perfect fits</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Perfect Matches */}
        {!analyzing && perfectMatches.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Perfect Matches" count={perfectMatches.length} />
            <Text style={styles.sectionSubtitle}>Top picks tailored to your room</Text>
            <View style={styles.largeCardList}>
              {perfectMatches.map((rec, i) => (
                <AnimatedPressable
                  key={rec.item.id}
                  onPress={() => handleOpenDetail(rec)}
                  style={{ flex: 1 }}
                >
                  <RecommendationCard
                    recommendation={rec}
                    onAdd={() => handleAddToRoom(rec)}
                    onSave={() => handleSaveForLater(rec)}
                    variant="large"
                    isSaved={favorites.includes(rec.item.id)}
                    index={i}
                  />
                </AnimatedPressable>
              ))}
            </View>
          </View>
        )}

        {/* Complete Your Style */}
        {!analyzing && styleMatches.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Complete Your Style" count={styleMatches.length} />
            <Text style={styles.sectionSubtitle}>
              {styleLabel}
              {' '}
              pieces that match your aesthetic
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {styleMatches.map((rec, i) => (
                <AnimatedPressable
                  key={rec.item.id}
                  onPress={() => handleOpenDetail(rec)}
                >
                  <RecommendationCard
                    recommendation={rec}
                    onAdd={() => handleAddToRoom(rec)}
                    onSave={() => handleSaveForLater(rec)}
                    variant="medium"
                    isSaved={favorites.includes(rec.item.id)}
                    index={i}
                  />
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fill Empty Spaces */}
        {!analyzing && spaceFills.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Fill Empty Spaces" count={spaceFills.length} />
            <Text style={styles.sectionSubtitle}>Sized to fit your available floor area</Text>
            <View style={styles.smallCardList}>
              {spaceFills.map((rec, i) => (
                <AnimatedPressable
                  key={rec.item.id}
                  onPress={() => handleOpenDetail(rec)}
                >
                  <RecommendationCard
                    recommendation={rec}
                    onAdd={() => handleAddToRoom(rec)}
                    onSave={() => handleSaveForLater(rec)}
                    variant="small"
                    isSaved={favorites.includes(rec.item.id)}
                    index={i}
                  />
                </AnimatedPressable>
              ))}
            </View>
          </View>
        )}

        {/* Popular in Similar Rooms */}
        {!analyzing && popularPicks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Popular in Similar Rooms" count={popularPicks.length} />
            <Text style={styles.sectionSubtitle}>Trending in {room.type} rooms worldwide</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {popularPicks.map((rec, i) => (
                <AnimatedPressable
                  key={rec.item.id}
                  onPress={() => handleOpenDetail(rec)}
                >
                  <View style={styles.popularCard}>
                    <View style={styles.popularEmojiWrap}>
                      <Text style={styles.popularEmoji}>{rec.item.emoji}</Text>
                    </View>
                    <Text style={styles.popularName} numberOfLines={2}>{rec.item.name}</Text>
                    <Text style={styles.popularProof}>
                      Used in {(1000 + i * 847 + rec.score * 23).toLocaleString()} rooms
                    </Text>
                    {rec.item.price !== undefined && (
                      <Text style={styles.popularPrice}>${Number(rec.item.price).toLocaleString()}</Text>
                    )}
                  </View>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Budget Picks */}
        {!analyzing && budgetPicks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Budget Picks" count={budgetPicks.length} />
            <Text style={styles.sectionSubtitle}>Great style under $200</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {budgetPicks.map((rec, i) => (
                <AnimatedPressable
                  key={rec.item.id}
                  onPress={() => handleOpenDetail(rec)}
                >
                  <View style={styles.budgetCard}>
                    <Text style={styles.budgetEmoji}>{rec.item.emoji}</Text>
                    <Text style={styles.budgetName} numberOfLines={2}>{rec.item.name}</Text>
                    {rec.item.price !== undefined && (
                      <Text style={styles.budgetPrice}>${Number(rec.item.price).toLocaleString()}</Text>
                    )}
                    <View style={styles.budgetBadge}>
                      <Text style={styles.budgetBadgeText}>Under $200</Text>
                    </View>
                  </View>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Empty state */}
        {!analyzing && filteredRecs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptySubtitle}>Try changing the category or price filter</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Recommendations] Reset filters from empty state');
                setActiveFilter('All');
                setPriceFilter('Any Price');
              }}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Reset filters</Text>
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>

      {/* Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity, bottom: insets.bottom + 24 }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Item Detail Bottom Sheet */}
      <BottomSheet
        visible={!!selectedRec}
        onClose={() => {
          console.log('[Recommendations] Close detail sheet');
          setSelectedRec(null);
        }}
        maxHeight={620}
      >
        {selectedRec && (
          <ScrollView
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Emoji + name */}
            <View style={styles.detailEmojiWrap}>
              <Text style={styles.detailEmoji}>{selectedRec.item.emoji}</Text>
            </View>
            <Text style={styles.detailName}>{selectedRec.item.name}</Text>
            <Text style={styles.detailSubcat}>
              {selectedRec.item.category}
              {' · '}
              {selectedRec.item.subcategory}
            </Text>

            {selectedPriceDisplay !== null && (
              <Text style={styles.detailPrice}>{selectedPriceDisplay}</Text>
            )}

            {/* Score */}
            <View style={styles.detailScoreRow}>
              <View style={styles.detailScoreBadge}>
                <Text style={styles.detailScoreText}>{selectedRec.score}% match</Text>
              </View>
              <View style={styles.detailScoreTrack}>
                <View style={[styles.detailScoreFill, { width: `${selectedRec.score}%` as `${number}%` }]} />
              </View>
            </View>

            {/* Why we recommend */}
            <View style={styles.whyBox}>
              <Text style={styles.whyLabel}>Why we recommend this</Text>
              <Text style={styles.whyText}>{selectedRec.reason}</Text>
              <View style={styles.whyTags}>
                <View style={styles.whyTag}>
                  <Text style={styles.whyTagText}>
                    {selectedRec.item.width}×{selectedRec.item.depth}cm
                  </Text>
                </View>
                {selectedRec.item.style.map(s => (
                  <View key={s} style={styles.whyTag}>
                    <Text style={styles.whyTagText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Similar items */}
            {similarItems.length > 0 && (
              <View style={styles.similarSection}>
                <Text style={styles.similarLabel}>View Similar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.similarRow}>
                    {similarItems.map(sim => (
                      <AnimatedPressable
                        key={sim.id}
                        onPress={() => {
                          console.log('[Recommendations] View similar item:', sim.id, sim.name);
                          const simRec = allRecs.find(r => r.item.id === sim.id);
                          if (simRec) setSelectedRec(simRec);
                        }}
                        style={styles.similarCard}
                      >
                        <Text style={styles.similarEmoji}>{sim.emoji}</Text>
                        <Text style={styles.similarName} numberOfLines={2}>{sim.name}</Text>
                        {sim.price !== undefined && (
                          <Text style={styles.similarPrice}>${Number(sim.price).toLocaleString()}</Text>
                        )}
                      </AnimatedPressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Actions */}
            <AnimatedPressable
              onPress={() => {
                console.log('[Recommendations] Add to room from detail sheet:', selectedRec.item.id);
                handleAddToRoom(selectedRec);
              }}
              style={styles.detailAddBtnWrap}
            >
              <LinearGradient
                colors={[COLORS.accent, '#00B894']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.detailAddBtn}
              >
                <Text style={styles.detailAddBtnText}>Add to Room</Text>
              </LinearGradient>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={handleAddToShoppingList}
              style={styles.detailShoppingBtn}
            >
              <ShoppingCart size={16} color={COLORS.primary} />
              <Text style={styles.detailShoppingBtnText}>Add to Shopping List</Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                console.log('[Recommendations] Save for later from detail sheet:', selectedRec.item.id);
                handleSaveForLater(selectedRec);
              }}
              style={[
                styles.detailFavBtn,
                favorites.includes(selectedRec.item.id) && styles.detailFavBtnActive,
              ]}
            >
              <Heart
                size={16}
                color={favorites.includes(selectedRec.item.id) ? COLORS.danger : COLORS.textSecondary}
                fill={favorites.includes(selectedRec.item.id) ? COLORS.danger : 'none'}
              />
              <Text style={[
                styles.detailFavBtnText,
                favorites.includes(selectedRec.item.id) && { color: COLORS.danger },
              ]}>
                {favorites.includes(selectedRec.item.id) ? 'Saved to Favorites' : 'Save for Later'}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 12,
  },
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  filterChipPrice: {
    backgroundColor: COLORS.accentMuted,
    borderColor: COLORS.accent,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  filterChipPriceText: {
    color: COLORS.accent,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.divider,
    marginHorizontal: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 24,
  },
  // Analysis card
  analysisCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analyzingContent: {
    gap: 12,
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyzingText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  skeletonGroup: {
    gap: 8,
  },
  analysisContent: {
    gap: 12,
  },
  analysisTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  analysisRoomName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  analysisStyle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  analysisBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  analysisBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coverageLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  coverageValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  coverageTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  coverageFill: {
    height: 6,
    borderRadius: 3,
  },
  analysisStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analysisStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  analysisStatValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  analysisStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  analysisStatDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  // Sections
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sectionBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: -6,
  },
  largeCardList: {
    gap: 12,
  },
  smallCardList: {
    gap: 8,
  },
  horizontalScroll: {
    gap: 10,
    paddingRight: 16,
  },
  // Popular card
  popularCard: {
    width: 130,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  popularEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularEmoji: {
    fontSize: 24,
  },
  popularName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  popularProof: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '500',
  },
  popularPrice: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  // Budget card
  budgetCard: {
    width: 130,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
    gap: 6,
  },
  budgetEmoji: {
    fontSize: 28,
  },
  budgetName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  budgetPrice: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '800',
  },
  budgetBadge: {
    backgroundColor: COLORS.success + '20',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  budgetBadgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '700',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
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
  // Error state
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorEmoji: {
    fontSize: 56,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  errorSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  errorBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  errorBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  // Toast
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  toastText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  // Detail sheet
  detailContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  detailEmojiWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailEmoji: {
    fontSize: 44,
  },
  detailName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  detailSubcat: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  detailPrice: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  detailScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  detailScoreBadge: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailScoreText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  detailScoreTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  detailScoreFill: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  whyBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  whyLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  whyText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  whyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  whyTag: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  whyTagText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  similarSection: {
    width: '100%',
    gap: 8,
  },
  similarLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  similarEmoji: {
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
  detailAddBtnWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  detailAddBtn: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 14,
  },
  detailAddBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  detailShoppingBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  detailShoppingBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  detailFavBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailFavBtnActive: {
    backgroundColor: COLORS.danger + '15',
    borderColor: COLORS.danger + '40',
  },
  detailFavBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
