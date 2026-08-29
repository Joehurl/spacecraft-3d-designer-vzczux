import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, Sparkles } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, CATEGORY_COLORS } from '@/data/furniture';
import { FurnitureItem } from '@/types';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FurnitureCard } from '@/components/FurnitureCard';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { generateRecommendations } from '@/utils/recommendationEngine';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 3;

export default function FurniturePickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projectId, roomId } = useLocalSearchParams<{ projectId: string; roomId: string }>();
  const { addPlacedItem, favorites, toggleFavorite, projects } = useFloorPlan();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const project = projects.find(p => p.id === projectId);
  const room = project?.rooms.find(r => r.id === roomId);

  const topRecommendations = useMemo(() => {
    if (!room || !project) return [];
    const recs = generateRecommendations(room, project);
    return recs.slice(0, 6).map(r => r.item);
  }, [room, project]);

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
    return items;
  }, [activeCategory, search]);

  const handleAddToRoom = useCallback(() => {
    if (!selectedId || !projectId || !roomId) return;
    const furniture = FURNITURE_CATALOG.find(f => f.id === selectedId);
    if (!furniture) return;

    console.log('[FurniturePicker] Add to room:', selectedId, 'project:', projectId, 'room:', roomId);
    addPlacedItem(projectId, roomId, {
      furnitureId: selectedId,
      x: 200,
      y: 200,
      rotation: 0,
      scale: 1,
      color: furniture.colors[0],
    });
    router.back();
  }, [selectedId, projectId, roomId, addPlacedItem, router]);

  const renderItem = useCallback(({ item, index }: { item: FurnitureItem; index: number }) => (
    <View style={{ width: CARD_W }}>
      <FurnitureCard
        item={item}
        isFavorite={favorites.includes(item.id)}
        onToggleFavorite={() => toggleFavorite(item.id)}
        onPress={() => {
          console.log('[FurniturePicker] Select item:', item.id);
          setSelectedId(prev => prev === item.id ? null : item.id);
        }}
        index={index}
        compact
      />
      {selectedId === item.id && (
        <View style={styles.selectedOverlay}>
          <Text style={styles.selectedCheck}>✓</Text>
        </View>
      )}
    </View>
  ), [favorites, toggleFavorite, selectedId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log('[FurniturePicker] Close');
            router.back();
          }}
          style={styles.closeBtn}
        >
          <X size={22} color={COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.title}>Add Furniture</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={18} color={COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search furniture..."
          placeholderTextColor={COLORS.textTertiary}
          value={search}
          onChangeText={text => {
            console.log('[FurniturePicker] Search:', text);
            setSearch(text);
          }}
        />
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {FURNITURE_CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          const color = cat.id === 'all' ? COLORS.primary : (CATEGORY_COLORS[cat.id] ?? COLORS.primary);
          return (
            <AnimatedPressable
              key={cat.id}
              onPress={() => {
                console.log('[FurniturePicker] Category:', cat.id);
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
      </ScrollView>

      {/* Recommended for your room */}
      {topRecommendations.length > 0 && (
        <View style={styles.recSection}>
          <View style={styles.recHeader}>
            <Sparkles size={14} color={COLORS.accent} />
            <Text style={styles.recTitle}>Recommended for your room</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recScroll}
          >
            {topRecommendations.map(item => (
              <AnimatedPressable
                key={item.id}
                onPress={() => {
                  console.log('[FurniturePicker] Recommended item selected:', item.id, item.name);
                  setSelectedId(prev => prev === item.id ? null : item.id);
                }}
                style={[styles.recCard, selectedId === item.id && styles.recCardSelected]}
              >
                <Text style={styles.recEmoji}>{item.emoji}</Text>
                <Text style={styles.recName} numberOfLines={2}>{item.name}</Text>
                {item.price !== undefined && (
                  <Text style={styles.recPrice}>${Number(item.price).toLocaleString()}</Text>
                )}
              </AnimatedPressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Count */}
      <Text style={styles.countText}>{filtered.length} items</Text>

      {/* Grid */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        initialNumToRender={24}
        maxToRenderPerBatch={12}
      />

      {/* Add button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <AnimatedPressable
          onPress={handleAddToRoom}
          disabled={!selectedId}
          style={[styles.addBtn, !selectedId && { opacity: 0.4 }]}
        >
          <Text style={styles.addBtnText}>
            {selectedId
              ? `Add ${FURNITURE_CATALOG.find(f => f.id === selectedId)?.name ?? 'Item'} to Room`
              : 'Select an item'}
          </Text>
        </AnimatedPressable>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
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
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  catScroll: {
    marginBottom: 8,
  },
  catContent: {
    paddingHorizontal: 16,
    gap: 8,
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
  recSection: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recTitle: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  recScroll: {
    gap: 8,
    paddingRight: 4,
  },
  recCard: {
    width: 90,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentMuted,
  },
  recEmoji: {
    fontSize: 24,
  },
  recName: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  recPrice: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  countText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 8,
  },
  row: {
    gap: 8,
    justifyContent: 'flex-start',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary + '33',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  selectedCheck: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
