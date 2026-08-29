import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TextInput,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, ChevronRight, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import {
  ROOM_TEMPLATES,
  STAFF_PICKS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_STYLES,
  TEMPLATE_SIZES,
  RoomTemplate,
} from '@/data/templates';
import { FURNITURE_CATALOG } from '@/data/furniture';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;

const STYLE_COLORS: Record<string, string> = {
  modern: '#4F8EF7',
  scandinavian: '#00D4AA',
  industrial: '#F59E0B',
  bohemian: '#A78BFA',
  minimalist: '#94A3B8',
  classic: '#F472B6',
};

const SIZE_LABELS: Record<string, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
};

function getFurnitureName(id: string): string {
  const item = FURNITURE_CATALOG.find(f => f.id === id);
  return item ? item.name : id;
}

function getFurnitureEmoji(id: string): string {
  const item = FURNITURE_CATALOG.find(f => f.id === id);
  return item ? item.emoji : '📦';
}

// ─── Mini floor plan SVG-like preview ────────────────────────────────────────
function MiniFloorPlan({ template }: { template: RoomTemplate }) {
  const { room } = template;
  const scaleX = 220 / (room.width || 500);
  const scaleY = 140 / (room.height || 400);
  const scale = Math.min(scaleX, scaleY) * 0.85;

  const scaledW = (room.width || 500) * scale;
  const scaledH = (room.height || 400) * scale;
  const offsetX = (220 - scaledW) / 2;
  const offsetY = (140 - scaledH) / 2;

  return (
    <View style={miniStyles.container}>
      {/* Floor */}
      <View
        style={[
          miniStyles.floor,
          {
            left: offsetX,
            top: offsetY,
            width: scaledW,
            height: scaledH,
            backgroundColor: room.floorColor + '88',
          },
        ]}
      />
      {/* Walls */}
      {room.walls.map(wall => {
        const x1 = wall.x1 * scale + offsetX;
        const y1 = wall.y1 * scale + offsetY;
        const x2 = wall.x2 * scale + offsetX;
        const y2 = wall.y2 * scale + offsetY;
        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        return (
          <View
            key={wall.id}
            style={[
              miniStyles.wall,
              {
                left: x1,
                top: y1 - 1.5,
                width: length,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: '0 50%',
              },
            ]}
          />
        );
      })}
      {/* Furniture dots */}
      {room.placedItems.slice(0, 8).map(item => {
        const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
        if (!furniture) return null;
        const fw = furniture.width * scale * (item.scale || 1);
        const fh = furniture.depth * scale * (item.scale || 1);
        const fx = item.x * scale + offsetX - fw / 2;
        const fy = item.y * scale + offsetY - fh / 2;
        return (
          <View
            key={item.id}
            style={[
              miniStyles.furniture,
              {
                left: fx,
                top: fy,
                width: Math.max(fw, 4),
                height: Math.max(fh, 4),
                backgroundColor: template.previewColor + '55',
                borderColor: template.previewColor + '99',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: {
    width: 220,
    height: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  floor: {
    position: 'absolute',
    borderRadius: 2,
  },
  wall: {
    position: 'absolute',
    height: 3,
    backgroundColor: COLORS.text,
    borderRadius: 1.5,
  },
  furniture: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 1,
  },
});

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({
  template,
  onPress,
  index,
}: {
  template: RoomTemplate;
  onPress: () => void;
  index: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const styleColor = STYLE_COLORS[template.style] || COLORS.primary;
  const furnitureCount = template.room.placedItems.length;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={onPress} style={[cardStyles.card, { width: CARD_W }]}>
        {/* Gradient header */}
        <LinearGradient
          colors={[template.previewColor + '33', template.previewColor + '11']}
          style={cardStyles.header}
        >
          <Text style={cardStyles.emoji}>{template.emoji}</Text>
          {template.popular && (
            <View style={[cardStyles.badge, { backgroundColor: COLORS.warning + '33', borderColor: COLORS.warning + '55' }]}>
              <Text style={[cardStyles.badgeText, { color: COLORS.warning }]}>Popular</Text>
            </View>
          )}
          {template.isNew && !template.popular && (
            <View style={[cardStyles.badge, { backgroundColor: COLORS.accent + '33', borderColor: COLORS.accent + '55' }]}>
              <Text style={[cardStyles.badgeText, { color: COLORS.accent }]}>New</Text>
            </View>
          )}
        </LinearGradient>

        {/* Info */}
        <View style={cardStyles.info}>
          <Text style={cardStyles.name} numberOfLines={2}>{template.name}</Text>
          <View style={cardStyles.meta}>
            <View style={[cardStyles.styleBadge, { backgroundColor: styleColor + '22' }]}>
              <Text style={[cardStyles.styleText, { color: styleColor }]}>
                {template.style.charAt(0).toUpperCase() + template.style.slice(1)}
              </Text>
            </View>
            <View style={cardStyles.sizeBadge}>
              <Text style={cardStyles.sizeText}>{SIZE_LABELS[template.size]}</Text>
            </View>
          </View>
          <Text style={cardStyles.furnitureCount}>{furnitureCount} items</Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  header: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emoji: {
    fontSize: 40,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    padding: 12,
    gap: 6,
  },
  name: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  styleBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  styleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sizeBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  sizeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  furnitureCount: {
    color: COLORS.textTertiary,
    fontSize: 11,
  },
});

// ─── Staff Pick Card ──────────────────────────────────────────────────────────
function StaffPickCard({ template, onPress }: { template: RoomTemplate; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} style={staffStyles.card}>
      <LinearGradient
        colors={[template.previewColor + '44', template.previewColor + '11']}
        style={staffStyles.gradient}
      >
        <View style={staffStyles.starBadge}>
          <Star size={10} color={COLORS.warning} fill={COLORS.warning} />
          <Text style={staffStyles.starText}>Staff Pick</Text>
        </View>
        <Text style={staffStyles.emoji}>{template.emoji}</Text>
        <Text style={staffStyles.name} numberOfLines={2}>{template.name}</Text>
        <Text style={staffStyles.style}>
          {template.style.charAt(0).toUpperCase() + template.style.slice(1)}
        </Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const staffStyles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 12,
  },
  gradient: {
    padding: 16,
    height: 180,
    justifyContent: 'flex-end',
    gap: 4,
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning + '22',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  starText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  name: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  style: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});

// ─── Detail Sheet ─────────────────────────────────────────────────────────────
function TemplateDetailSheet({
  template,
  visible,
  onClose,
  onUse,
}: {
  template: RoomTemplate | null;
  visible: boolean;
  onClose: () => void;
  onUse: (template: RoomTemplate) => void;
}) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!template) return null;

  const styleColor = STYLE_COLORS[template.style] || COLORS.primary;
  const furnitureItems = template.room.placedItems.slice(0, 6);
  const extraCount = template.room.placedItems.length - 6;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[detailStyles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[detailStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={detailStyles.handle} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={detailStyles.content}>
          {/* Header */}
          <View style={detailStyles.header}>
            <View style={detailStyles.headerLeft}>
              <Text style={detailStyles.emoji}>{template.emoji}</Text>
              <View style={detailStyles.headerInfo}>
                <Text style={detailStyles.title}>{template.name}</Text>
                <View style={detailStyles.badges}>
                  <View style={[detailStyles.badge, { backgroundColor: styleColor + '22' }]}>
                    <Text style={[detailStyles.badgeText, { color: styleColor }]}>
                      {template.style.charAt(0).toUpperCase() + template.style.slice(1)}
                    </Text>
                  </View>
                  <View style={[detailStyles.badge, { backgroundColor: COLORS.surfaceSecondary }]}>
                    <Text style={[detailStyles.badgeText, { color: COLORS.textSecondary }]}>
                      {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                    </Text>
                  </View>
                  <View style={[detailStyles.badge, { backgroundColor: COLORS.surfaceSecondary }]}>
                    <Text style={[detailStyles.badgeText, { color: COLORS.textSecondary }]}>
                      {template.size.charAt(0).toUpperCase() + template.size.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <AnimatedPressable onPress={onClose} style={detailStyles.closeBtn}>
              <X size={18} color={COLORS.textSecondary} />
            </AnimatedPressable>
          </View>

          {/* Description */}
          <Text style={detailStyles.description}>{template.description}</Text>

          {/* Mini floor plan */}
          <View style={detailStyles.previewContainer}>
            <Text style={detailStyles.sectionLabel}>Floor Plan Preview</Text>
            <View style={detailStyles.previewBox}>
              <MiniFloorPlan template={template} />
            </View>
          </View>

          {/* Furniture list */}
          <View style={detailStyles.furnitureSection}>
            <Text style={detailStyles.sectionLabel}>
              Included Furniture
              <Text style={detailStyles.furnitureCountLabel}> · {template.room.placedItems.length} items</Text>
            </Text>
            <View style={detailStyles.furnitureList}>
              {furnitureItems.map(item => (
                <View key={item.id} style={detailStyles.furnitureItem}>
                  <Text style={detailStyles.furnitureEmoji}>{getFurnitureEmoji(item.furnitureId)}</Text>
                  <Text style={detailStyles.furnitureName} numberOfLines={1}>
                    {getFurnitureName(item.furnitureId)}
                  </Text>
                </View>
              ))}
              {extraCount > 0 && (
                <View style={detailStyles.furnitureItem}>
                  <Text style={detailStyles.furnitureEmoji}>📦</Text>
                  <Text style={[detailStyles.furnitureName, { color: COLORS.textSecondary }]}>
                    +{extraCount} more items
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Tags */}
          <View style={detailStyles.tagsRow}>
            {template.tags.map(tag => (
              <View key={tag} style={detailStyles.tag}>
                <Text style={detailStyles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={detailStyles.actions}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Templates] Use template:', template.id, template.name);
              onUse(template);
            }}
            style={detailStyles.useBtn}
          >
            <LinearGradient
              colors={[template.previewColor, template.previewColor + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={detailStyles.useBtnGradient}
            >
              <Text style={detailStyles.useBtnText}>Use This Template</Text>
              <ChevronRight size={18} color="#fff" />
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  emoji: {
    fontSize: 40,
  },
  headerInfo: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  previewContainer: {
    gap: 10,
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  furnitureCountLabel: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  previewBox: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  furnitureSection: {
    gap: 10,
  },
  furnitureList: {
    gap: 8,
  },
  furnitureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  furnitureEmoji: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  furnitureName: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  useBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  useBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  useBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TemplatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createProject, updateProject, setActiveProject } = useFloorPlan();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [popularOnly, setPopularOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplate | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const filteredTemplates = useMemo(() => {
    return ROOM_TEMPLATES.filter(t => {
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (selectedStyle !== 'all' && t.style !== selectedStyle) return false;
      if (selectedSize !== 'all' && t.size !== selectedSize) return false;
      if (popularOnly && !t.popular) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q)) ||
          t.style.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, selectedStyle, selectedSize, popularOnly, search]);

  const handleOpenDetail = useCallback((template: RoomTemplate) => {
    console.log('[Templates] Open detail:', template.id, template.name);
    setSelectedTemplate(template);
    setDetailVisible(true);
  }, []);

  const handleUseTemplate = useCallback((template: RoomTemplate) => {
    console.log('[Templates] Apply template:', template.id, template.name);
    const project = createProject(template.name, template.style);
    updateProject(project.id, {
      rooms: [{ ...template.room, id: project.rooms[0]?.id || 'room-1' }],
    });
    setActiveProject(project.id);
    setDetailVisible(false);
    router.replace(`/editor/${project.id}`);
  }, [createProject, updateProject, setActiveProject, router]);

  const renderTemplate = useCallback(({ item, index }: { item: RoomTemplate; index: number }) => (
    <TemplateCard
      template={item}
      onPress={() => handleOpenDetail(item)}
      index={index}
    />
  ), [handleOpenDetail]);

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedStyle !== 'all',
    selectedSize !== 'all',
    popularOnly,
  ].filter(Boolean).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>📐 Room Templates</Text>
            <Text style={styles.headerSub}>{ROOM_TEMPLATES.length} pre-built layouts</Text>
          </View>
          <AnimatedPressable
            onPress={() => {
              console.log('[Templates] Close screen');
              router.back();
            }}
            style={styles.closeBtn}
          >
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            placeholderTextColor={COLORS.textTertiary}
            value={search}
            onChangeText={text => {
              console.log('[Templates] Search:', text);
              setSearch(text);
            }}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <AnimatedPressable onPress={() => setSearch('')}>
              <X size={14} color={COLORS.textTertiary} />
            </AnimatedPressable>
          )}
        </View>
      </Animated.View>

      <FlatList
        data={filteredTemplates}
        renderItem={renderTemplate}
        keyExtractor={item => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Staff Picks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⭐ Staff Picks</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.staffScroll}
                contentContainerStyle={styles.staffScrollContent}
              >
                {STAFF_PICKS.map(t => (
                  <StaffPickCard
                    key={t.id}
                    template={t}
                    onPress={() => handleOpenDetail(t)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Category filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {TEMPLATE_CATEGORIES.map(cat => (
                <AnimatedPressable
                  key={cat.id}
                  onPress={() => {
                    console.log('[Templates] Filter category:', cat.id);
                    setSelectedCategory(cat.id);
                  }}
                  style={[
                    styles.filterChip,
                    selectedCategory === cat.id && styles.filterChipActive,
                  ]}
                >
                  <Text style={styles.filterChipEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.filterChipText,
                    selectedCategory === cat.id && styles.filterChipTextActive,
                  ]}>
                    {cat.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </ScrollView>

            {/* Style filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {TEMPLATE_STYLES.map(s => (
                <AnimatedPressable
                  key={s.id}
                  onPress={() => {
                    console.log('[Templates] Filter style:', s.id);
                    setSelectedStyle(s.id);
                  }}
                  style={[
                    styles.filterChip,
                    selectedStyle === s.id && styles.filterChipActive,
                    s.id !== 'all' && selectedStyle === s.id && {
                      borderColor: STYLE_COLORS[s.id] + '88',
                      backgroundColor: STYLE_COLORS[s.id] + '22',
                    },
                  ]}
                >
                  {s.id !== 'all' && (
                    <View style={[styles.styleDot, { backgroundColor: STYLE_COLORS[s.id] }]} />
                  )}
                  <Text style={[
                    styles.filterChipText,
                    selectedStyle === s.id && styles.filterChipTextActive,
                    s.id !== 'all' && selectedStyle === s.id && { color: STYLE_COLORS[s.id] },
                  ]}>
                    {s.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </ScrollView>

            {/* Size + Popular row */}
            <View style={styles.sizePopularRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={styles.filterRow}
              >
                {TEMPLATE_SIZES.map(sz => (
                  <AnimatedPressable
                    key={sz.id}
                    onPress={() => {
                      console.log('[Templates] Filter size:', sz.id);
                      setSelectedSize(sz.id);
                    }}
                    style={[
                      styles.filterChip,
                      selectedSize === sz.id && styles.filterChipActive,
                    ]}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedSize === sz.id && styles.filterChipTextActive,
                    ]}>
                      {sz.label}
                    </Text>
                  </AnimatedPressable>
                ))}
              </ScrollView>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Templates] Toggle popular:', !popularOnly);
                  setPopularOnly(p => !p);
                }}
                style={[styles.popularChip, popularOnly && styles.popularChipActive]}
              >
                <Text style={[styles.popularChipText, popularOnly && styles.popularChipTextActive]}>
                  🔥 Popular
                </Text>
              </AnimatedPressable>
            </View>

            {/* Results count */}
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                {activeFiltersCount > 0 && ` · ${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} active`}
              </Text>
              {activeFiltersCount > 0 && (
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Templates] Clear all filters');
                    setSelectedCategory('all');
                    setSelectedStyle('all');
                    setSelectedSize('all');
                    setPopularOnly(false);
                    setSearch('');
                  }}
                >
                  <Text style={styles.clearFilters}>Clear all</Text>
                </AnimatedPressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No templates found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or search query</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Templates] Clear filters from empty state');
                setSelectedCategory('all');
                setSelectedStyle('all');
                setSelectedSize('all');
                setPopularOnly(false);
                setSearch('');
              }}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Clear filters</Text>
            </AnimatedPressable>
          </View>
        }
      />

      {/* Detail Sheet */}
      <TemplateDetailSheet
        template={selectedTemplate}
        visible={detailVisible}
        onClose={() => {
          console.log('[Templates] Close detail sheet');
          setDetailVisible(false);
        }}
        onUse={handleUseTemplate}
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listHeader: {
    gap: 0,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
    marginTop: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  staffScroll: {
    marginHorizontal: -16,
  },
  staffScrollContent: {
    paddingHorizontal: 16,
  },
  filterScroll: {
    marginHorizontal: -16,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  filterChipEmoji: {
    fontSize: 13,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  styleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sizePopularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  popularChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  popularChipActive: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warning + '22',
  },
  popularChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  popularChipTextActive: {
    color: COLORS.warning,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resultsText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  clearFilters: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
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
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
