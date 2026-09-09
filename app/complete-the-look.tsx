import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, Check, Sparkles } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FurnitureItem, FurnitureCategory, Room } from '@/types';

const ROOM_RULES: Record<string, { category: string; label: string; priority: number }[]> = {
  living: [
    { category: 'seating', label: 'Seating', priority: 1 },
    { category: 'tables', label: 'Coffee Table', priority: 2 },
    { category: 'lighting', label: 'Lighting', priority: 3 },
    { category: 'storage', label: 'Storage', priority: 4 },
    { category: 'decor', label: 'Decor', priority: 5 },
  ],
  bedroom: [
    { category: 'beds', label: 'Bed', priority: 1 },
    { category: 'storage', label: 'Wardrobe / Dresser', priority: 2 },
    { category: 'lighting', label: 'Bedside Lighting', priority: 3 },
    { category: 'tables', label: 'Nightstand', priority: 4 },
    { category: 'decor', label: 'Decor', priority: 5 },
  ],
  office: [
    { category: 'tables', label: 'Desk', priority: 1 },
    { category: 'seating', label: 'Office Chair', priority: 2 },
    { category: 'storage', label: 'Shelving', priority: 3 },
    { category: 'lighting', label: 'Task Lighting', priority: 4 },
  ],
  dining: [
    { category: 'tables', label: 'Dining Table', priority: 1 },
    { category: 'seating', label: 'Dining Chairs', priority: 2 },
    { category: 'lighting', label: 'Pendant Light', priority: 3 },
    { category: 'storage', label: 'Sideboard', priority: 4 },
  ],
  kitchen: [
    { category: 'tables', label: 'Kitchen Island / Table', priority: 1 },
    { category: 'seating', label: 'Bar Stools', priority: 2 },
    { category: 'storage', label: 'Pantry / Cabinets', priority: 3 },
    { category: 'lighting', label: 'Under-cabinet Lighting', priority: 4 },
  ],
  bathroom: [
    { category: 'storage', label: 'Vanity / Cabinet', priority: 1 },
    { category: 'lighting', label: 'Mirror Light', priority: 2 },
    { category: 'decor', label: 'Accessories', priority: 3 },
  ],
  other: [
    { category: 'seating', label: 'Seating', priority: 1 },
    { category: 'lighting', label: 'Lighting', priority: 2 },
    { category: 'decor', label: 'Decor', priority: 3 },
  ],
};

const ROOM_TYPE_EMOJI: Record<string, string> = {
  living: '🛋️',
  bedroom: '🛏️',
  kitchen: '🍳',
  bathroom: '🛁',
  office: '🖥️',
  dining: '🍽️',
  other: '🏠',
};

function CompletionRing({ pct }: { pct: number }) {
  const color = pct >= 1 ? COLORS.success : pct >= 0.6 ? COLORS.warning : COLORS.primary;
  const pctDisplay = Math.round(pct * 100);
  return (
    <View style={ringStyles.container}>
      <View style={[ringStyles.ring, { borderColor: color }]}>
        <Text style={[ringStyles.pct, { color }]}>{pctDisplay}%</Text>
        <Text style={ringStyles.label}>complete</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  ring: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    gap: 0,
  },
  pct: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default function CompleteTheLookScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects, favorites, toggleFavorite } = useFloorPlan();

  const project = projects.find(p => p.id === projectId);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(project?.rooms[0]?.id ?? '');

  const selectedRoom = project?.rooms.find(r => r.id === selectedRoomId);

  const analysis = useMemo(() => {
    if (!selectedRoom || !project) return null;

    const rules = ROOM_RULES[selectedRoom.type] ?? ROOM_RULES.other;
    const placedFurniture = selectedRoom.placedItems
      .map(item => FURNITURE_CATALOG.find(f => f.id === item.furnitureId))
      .filter(Boolean) as FurnitureItem[];

    const coveredCategories = new Set(placedFurniture.map(f => f.category as string));

    const missing = rules.filter(r => !coveredCategories.has(r.category));
    const covered = rules.filter(r => coveredCategories.has(r.category));

    const completionPct = rules.length > 0 ? covered.length / rules.length : 0;

    const suggestions: { rule: typeof rules[0]; items: FurnitureItem[] }[] = missing.map(rule => {
      const items = FURNITURE_CATALOG
        .filter(f => (f.category as string) === rule.category && f.style.includes(project.style))
        .slice(0, 3);
      const fallback = items.length < 3
        ? FURNITURE_CATALOG.filter(f => (f.category as string) === rule.category).slice(0, 3 - items.length)
        : [];
      return { rule, items: [...items, ...fallback].slice(0, 3) };
    });

    const coveredDetails = covered.map(rule => {
      const items = placedFurniture.filter(f => (f.category as string) === rule.category);
      return { rule, items };
    });

    return { missing, covered, completionPct, suggestions, coveredDetails };
  }, [selectedRoom, project]);

  const handleToggleFavorite = useCallback((itemId: string) => {
    console.log('[CompleteTheLook] Toggle favorite:', itemId);
    toggleFavorite(itemId);
  }, [toggleFavorite]);

  if (!project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={20} color={COLORS.accent} />
          <Text style={styles.headerTitle}>Complete the Look</Text>
        </View>
        <AnimatedPressable
          onPress={() => {
            console.log('[CompleteTheLook] Close pressed');
            router.back();
          }}
          style={styles.closeBtn}
        >
          <X size={20} color={COLORS.text} />
        </AnimatedPressable>
      </View>

      {/* Room Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.roomSelectorRow}
      >
        {project.rooms.map(room => {
          const isActive = room.id === selectedRoomId;
          const emoji = ROOM_TYPE_EMOJI[room.type] ?? '🏠';
          return (
            <AnimatedPressable
              key={room.id}
              onPress={() => {
                console.log('[CompleteTheLook] Room selected:', room.id, room.name);
                setSelectedRoomId(room.id);
              }}
              style={[styles.roomChip, isActive && styles.roomChipActive]}
            >
              <Text style={styles.roomChipEmoji}>{emoji}</Text>
              <Text style={[styles.roomChipText, isActive && styles.roomChipTextActive]}>
                {room.name}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {analysis && selectedRoom && (
          <>
            {/* Completion Ring */}
            <View style={styles.completionCard}>
              <CompletionRing pct={analysis.completionPct} />
              <View style={styles.completionInfo}>
                <Text style={styles.completionTitle}>{selectedRoom.name}</Text>
                <Text style={styles.completionSub}>
                  {analysis.covered.length} of {analysis.missing.length + analysis.covered.length} categories filled
                </Text>
              </View>
            </View>

            {/* Missing Pieces */}
            {analysis.suggestions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Missing Pieces</Text>
                {analysis.suggestions.map(({ rule, items }) => {
                  const isEssential = rule.priority <= 2;
                  return (
                    <View key={rule.category} style={styles.missingCard}>
                      <View style={styles.missingHeader}>
                        <Text style={styles.missingLabel}>{rule.label}</Text>
                        <View style={[
                          styles.priorityBadge,
                          isEssential ? styles.priorityBadgeEssential : styles.priorityBadgeRecommended,
                        ]}>
                          <Text style={[
                            styles.priorityBadgeText,
                            isEssential ? styles.priorityBadgeTextEssential : styles.priorityBadgeTextRecommended,
                          ]}>
                            {isEssential ? 'Essential' : 'Recommended'}
                          </Text>
                        </View>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.suggestionsRow}
                      >
                        {items.map(item => {
                          const isFav = favorites.includes(item.id);
                          const priceText = item.price !== undefined ? `$${Number(item.price).toLocaleString()}` : 'POA';
                          return (
                            <View key={item.id} style={styles.suggestionCard}>
                              <Text style={styles.suggestionEmoji}>{item.emoji}</Text>
                              <Text style={styles.suggestionName} numberOfLines={2}>{item.name}</Text>
                              <Text style={styles.suggestionPrice}>{priceText}</Text>
                              <AnimatedPressable
                                onPress={() => handleToggleFavorite(item.id)}
                                style={[styles.heartBtn, isFav && styles.heartBtnActive]}
                              >
                                <Heart
                                  size={14}
                                  color={isFav ? COLORS.danger : COLORS.textSecondary}
                                  fill={isFav ? COLORS.danger : 'none'}
                                />
                              </AnimatedPressable>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Already Have */}
            {analysis.coveredDetails.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Already Have</Text>
                {analysis.coveredDetails.map(({ rule, items }) => (
                  <View key={rule.category} style={styles.coveredRow}>
                    <View style={styles.coveredCheck}>
                      <Check size={14} color={COLORS.success} />
                    </View>
                    <View style={styles.coveredInfo}>
                      <Text style={styles.coveredLabel}>{rule.label}</Text>
                      <Text style={styles.coveredItems} numberOfLines={1}>
                        {items.map(i => i.name).join(', ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {analysis.missing.length === 0 && (
              <View style={styles.completeState}>
                <Text style={styles.completeEmoji}>🎉</Text>
                <Text style={styles.completeTitle}>Room Complete!</Text>
                <Text style={styles.completeSub}>This room has all the essential categories covered.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    gap: 8,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  roomChipEmoji: {
    fontSize: 14,
  },
  roomChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  roomChipTextActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  completionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  completionInfo: {
    flex: 1,
    gap: 4,
  },
  completionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  completionSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  missingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  missingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missingLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  priorityBadgeEssential: {
    backgroundColor: COLORS.danger + '18',
    borderColor: COLORS.danger + '40',
  },
  priorityBadgeRecommended: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary + '40',
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityBadgeTextEssential: {
    color: COLORS.danger,
  },
  priorityBadgeTextRecommended: {
    color: COLORS.primary,
  },
  suggestionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  suggestionCard: {
    width: 110,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  suggestionEmoji: {
    fontSize: 28,
  },
  suggestionName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  suggestionPrice: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  heartBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heartBtnActive: {
    backgroundColor: COLORS.danger + '18',
    borderColor: COLORS.danger + '30',
  },
  coveredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  coveredCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.success + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coveredInfo: {
    flex: 1,
    gap: 2,
  },
  coveredLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  coveredItems: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  completeState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  completeEmoji: {
    fontSize: 48,
  },
  completeTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  completeSub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
