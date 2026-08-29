import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  PanResponder,
  Animated,
  Alert,
  Dimensions,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Share2, Plus, ZoomIn, ZoomOut, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useMoodBoard, MoodBoardItem } from '@/contexts/MoodBoardContext';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BottomSheet } from '@/components/BottomSheet';
import { FURNITURE_CATALOG } from '@/data/furniture';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_W = SCREEN_W * 2;
const CANVAS_H = SCREEN_H * 1.8;

// ─── Preset data ─────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E',
  '#78716C', '#6B7280', '#374151', '#1C1917', '#F5F5DC',
];

const NOTE_COLORS = ['#FEF08A', '#FCA5A5', '#93C5FD', '#86EFAC', '#F5F5F5'];
const NOTE_COLOR_LABELS = ['Yellow', 'Pink', 'Blue', 'Green', 'White'];

const INSPIRATION_IMAGES = [
  { label: 'Warm Living Room', emoji: '🌅', gradient: ['#7C2D12', '#C2410C'] as [string, string] },
  { label: 'Coastal Bedroom', emoji: '🌊', gradient: ['#0C4A6E', '#0284C7'] as [string, string] },
  { label: 'Industrial Kitchen', emoji: '⚙️', gradient: ['#1C1917', '#44403C'] as [string, string] },
  { label: 'Bohemian Lounge', emoji: '🌸', gradient: ['#4C1D95', '#7C3AED'] as [string, string] },
  { label: 'Minimalist Office', emoji: '💻', gradient: ['#1E3A5F', '#2563EB'] as [string, string] },
  { label: 'Scandinavian Dining', emoji: '🌿', gradient: ['#14532D', '#16A34A'] as [string, string] },
  { label: 'Luxury Bathroom', emoji: '🛁', gradient: ['#1E1B4B', '#4338CA'] as [string, string] },
  { label: 'Cozy Reading Nook', emoji: '📚', gradient: ['#78350F', '#D97706'] as [string, string] },
  { label: 'Modern Entryway', emoji: '🚪', gradient: ['#0F172A', '#334155'] as [string, string] },
  { label: 'Outdoor Patio', emoji: '☀️', gradient: ['#713F12', '#CA8A04'] as [string, string] },
  { label: 'Kids Playroom', emoji: '🎮', gradient: ['#831843', '#DB2777'] as [string, string] },
  { label: 'Home Gym', emoji: '💪', gradient: ['#052E16', '#15803D'] as [string, string] },
];

const PRESET_TAGS = [
  'Minimalist', 'Warm Tones', 'Natural Light', 'Bold Colors',
  'Cozy', 'Airy', 'Dark & Moody', 'Earthy',
  'Pastel', 'Monochrome', 'Maximalist', 'Zen',
];

const FURNITURE_CATEGORIES = ['All', 'seating', 'tables', 'storage', 'beds', 'lighting', 'decor'];

// ─── Board item component ─────────────────────────────────────────────────────

interface BoardItemProps {
  item: MoodBoardItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onBringToFront: (id: string) => void;
}

function BoardItemView({ item, selected, onSelect, onMove, onDelete, onBringToFront }: BoardItemProps) {
  const pan = useRef(new Animated.ValueXY({ x: item.x, y: item.y })).current;
  const lastPos = useRef({ x: item.x, y: item.y });

  useEffect(() => {
    pan.setValue({ x: item.x, y: item.y });
    lastPos.current = { x: item.x, y: item.y };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({ x: lastPos.current.x, y: lastPos.current.y });
        pan.setValue({ x: 0, y: 0 });
        onBringToFront(item.id);
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        const newX = lastPos.current.x + g.dx;
        const newY = lastPos.current.y + g.dy;
        lastPos.current = { x: newX, y: newY };
        onMove(item.id, newX, newY);
      },
    })
  ).current;

  const renderContent = () => {
    switch (item.type) {
      case 'color': {
        const swatchColor = item.data.color ?? '#888';
        const swatchLabel = item.data.label ?? '';
        return (
          <View style={[styles.colorSwatch, { backgroundColor: swatchColor }]}>
            {swatchLabel ? (
              <View style={styles.swatchLabelWrap}>
                <Text style={styles.swatchLabel} numberOfLines={1}>{swatchLabel}</Text>
              </View>
            ) : null}
          </View>
        );
      }
      case 'furniture': {
        const fEmoji = item.data.furnitureEmoji ?? '🛋️';
        const fName = item.data.furnitureName ?? 'Furniture';
        const fPrice = item.data.furniturePrice ?? '';
        return (
          <View style={styles.furnitureCard}>
            <Text style={styles.furnitureEmoji}>{fEmoji}</Text>
            <Text style={styles.furnitureName} numberOfLines={2}>{fName}</Text>
            {fPrice ? <Text style={styles.furniturePrice}>{fPrice}</Text> : null}
          </View>
        );
      }
      case 'image': {
        const imgGradient = (item.data.gradientColors ?? ['#1a2a4a', '#2563EB']) as [string, string];
        const imgEmoji = item.data.imageEmoji ?? '🖼️';
        const imgLabel = item.data.imageLabel ?? '';
        return (
          <LinearGradient colors={imgGradient} style={styles.imageCard}>
            <Text style={styles.imageEmoji}>{imgEmoji}</Text>
            <Text style={styles.imageLabel} numberOfLines={2}>{imgLabel}</Text>
          </LinearGradient>
        );
      }
      case 'note': {
        const noteColor = item.data.noteColor ?? '#FEF08A';
        const noteText = item.data.text ?? '';
        return (
          <View style={[styles.noteCard, { backgroundColor: noteColor }]}>
            <Text style={styles.noteText}>{noteText}</Text>
          </View>
        );
      }
      case 'tag': {
        const tagText = item.data.tagText ?? '';
        return (
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{tagText}</Text>
          </View>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.boardItem,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }], zIndex: item.zIndex ?? 1 },
        selected && styles.boardItemSelected,
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          console.log('[MoodBoard] Select item:', item.id, item.type);
          onSelect(item.id);
        }}
      >
        {renderContent()}
      </TouchableOpacity>
      {selected && (
        <TouchableOpacity
          style={styles.deleteHandle}
          onPress={() => {
            console.log('[MoodBoard] Delete item:', item.id);
            onDelete(item.id);
          }}
        >
          <X size={10} color="#fff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type SheetType = 'color' | 'furniture' | 'image' | 'note' | 'tag' | null;

export default function MoodBoardScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects } = useFloorPlan();
  const { getBoardForProject, addItem, updateItem, removeItem, clearBoard, bringToFront } = useMoodBoard();

  const [activeProjectId, setActiveProjectId] = useState<string>(projectId ?? '');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [zoom, setZoom] = useState(1);

  // Add Color state
  const [colorLabel, setColorLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [customHex, setCustomHex] = useState('');

  // Add Furniture state
  const [furnitureSearch, setFurnitureSearch] = useState('');
  const [furnitureCategory, setFurnitureCategory] = useState('All');

  // Add Note state
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);

  // Add Tag state
  const [customTag, setCustomTag] = useState('');

  const board = activeProjectId ? getBoardForProject(activeProjectId) : null;
  const items = board?.items ?? [];

  const resolvedProjectId = activeProjectId || (projects[0]?.id ?? '');

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItemId((prev) => (prev === id ? null : id));
  }, []);

  const handleMove = useCallback(
    (id: string, x: number, y: number) => {
      updateItem(resolvedProjectId, id, { x, y });
    },
    [resolvedProjectId, updateItem]
  );

  const handleDelete = useCallback(
    (id: string) => {
      removeItem(resolvedProjectId, id);
      setSelectedItemId(null);
    },
    [resolvedProjectId, removeItem]
  );

  const handleBringToFront = useCallback(
    (id: string) => {
      bringToFront(resolvedProjectId, id);
    },
    [resolvedProjectId, bringToFront]
  );

  const handleAddColor = useCallback(() => {
    const color = customHex.startsWith('#') ? customHex : selectedColor;
    console.log('[MoodBoard] Add color:', color, 'label:', colorLabel);
    addItem(resolvedProjectId, {
      type: 'color',
      x: 40 + Math.random() * 200,
      y: 40 + Math.random() * 200,
      data: { color, label: colorLabel },
    });
    setColorLabel('');
    setCustomHex('');
    setActiveSheet(null);
  }, [resolvedProjectId, addItem, selectedColor, colorLabel, customHex]);

  const handleAddFurniture = useCallback(
    (furnitureId: string) => {
      const item = FURNITURE_CATALOG.find((f) => f.id === furnitureId);
      if (!item) return;
      console.log('[MoodBoard] Add furniture:', furnitureId, item.name);
      addItem(resolvedProjectId, {
        type: 'furniture',
        x: 40 + Math.random() * 200,
        y: 40 + Math.random() * 200,
        data: {
          furnitureId,
          furnitureName: item.name,
          furnitureEmoji: item.emoji,
          furniturePrice: `$${(Math.floor(Math.random() * 900) + 100).toLocaleString()}`,
        },
      });
      setActiveSheet(null);
    },
    [resolvedProjectId, addItem]
  );

  const handleAddImage = useCallback(
    (img: typeof INSPIRATION_IMAGES[0]) => {
      console.log('[MoodBoard] Add image:', img.label);
      addItem(resolvedProjectId, {
        type: 'image',
        x: 40 + Math.random() * 200,
        y: 40 + Math.random() * 200,
        data: {
          imageLabel: img.label,
          gradientColors: img.gradient,
          imageEmoji: img.emoji,
        },
      });
      setActiveSheet(null);
    },
    [resolvedProjectId, addItem]
  );

  const handleAddNote = useCallback(() => {
    if (!noteText.trim()) return;
    console.log('[MoodBoard] Add note:', noteText.slice(0, 30));
    addItem(resolvedProjectId, {
      type: 'note',
      x: 40 + Math.random() * 200,
      y: 40 + Math.random() * 200,
      data: { text: noteText, noteColor },
    });
    setNoteText('');
    setActiveSheet(null);
  }, [resolvedProjectId, addItem, noteText, noteColor]);

  const handleAddTag = useCallback(
    (tag: string) => {
      console.log('[MoodBoard] Add tag:', tag);
      addItem(resolvedProjectId, {
        type: 'tag',
        x: 40 + Math.random() * 200,
        y: 40 + Math.random() * 200,
        data: { tagText: tag },
      });
      setActiveSheet(null);
      setCustomTag('');
    },
    [resolvedProjectId, addItem]
  );

  const handleClearBoard = useCallback(() => {
    Alert.alert('Clear Board', 'Remove all items from this mood board?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          console.log('[MoodBoard] Clear board for project:', resolvedProjectId);
          clearBoard(resolvedProjectId);
          setSelectedItemId(null);
        },
      },
    ]);
  }, [resolvedProjectId, clearBoard]);

  const handleExport = useCallback(() => {
    console.log('[MoodBoard] Export pressed');
    Alert.alert('Export', 'Export coming soon');
  }, []);

  const handleShare = useCallback(() => {
    console.log('[MoodBoard] Share pressed');
    Alert.alert('Share', 'Share coming soon');
  }, []);

  const filteredFurniture = FURNITURE_CATALOG.filter((f) => {
    const matchCat = furnitureCategory === 'All' || f.category === furnitureCategory;
    const matchSearch =
      !furnitureSearch || f.name.toLowerCase().includes(furnitureSearch.toLowerCase());
    return matchCat && matchSearch;
  }).slice(0, 60);

  const currentProject = projects.find((p) => p.id === resolvedProjectId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log('[MoodBoard] Close pressed');
            router.back();
          }}
          style={styles.headerBtn}
        >
          <X size={22} color={COLORS.text} />
        </AnimatedPressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🎨 Mood Board</Text>
          {currentProject && (
            <Text style={styles.headerSub} numberOfLines={1}>{currentProject.name}</Text>
          )}
        </View>

        <View style={styles.headerRight}>
          <AnimatedPressable onPress={handleShare} style={styles.headerBtn}>
            <Share2 size={20} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[MoodBoard] Add button pressed');
              setActiveSheet('color');
            }}
            style={styles.addBtn}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* Project selector (when no projectId param) */}
      {!projectId && projects.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.projectScroll}
          contentContainerStyle={styles.projectScrollContent}
        >
          {projects.map((p) => (
            <AnimatedPressable
              key={p.id}
              onPress={() => {
                console.log('[MoodBoard] Select project:', p.id, p.name);
                setActiveProjectId(p.id);
              }}
              style={[
                styles.projectChip,
                activeProjectId === p.id && styles.projectChipActive,
              ]}
            >
              <Text
                style={[
                  styles.projectChipText,
                  activeProjectId === p.id && styles.projectChipTextActive,
                ]}
              >
                {p.name}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      )}

      {/* Canvas */}
      <View style={styles.canvasWrapper}>
        {/* Canvas controls */}
        <View style={styles.canvasControls}>
          <AnimatedPressable
            onPress={() => {
              const next = Math.min(zoom + 0.2, 2);
              console.log('[MoodBoard] Zoom in:', next.toFixed(1));
              setZoom(next);
            }}
            style={styles.canvasControlBtn}
          >
            <ZoomIn size={18} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              const next = Math.max(zoom - 0.2, 0.4);
              console.log('[MoodBoard] Zoom out:', next.toFixed(1));
              setZoom(next);
            }}
            style={styles.canvasControlBtn}
          >
            <ZoomOut size={18} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable onPress={handleExport} style={styles.canvasControlBtn}>
            <Share2 size={18} color={COLORS.accent} />
          </AnimatedPressable>
          <AnimatedPressable onPress={handleClearBoard} style={[styles.canvasControlBtn, styles.canvasControlDanger]}>
            <Trash2 size={18} color={COLORS.danger} />
          </AnimatedPressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.canvasScroll}
          contentContainerStyle={{ width: CANVAS_W * zoom }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ height: CANVAS_H * zoom }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.canvas, { width: CANVAS_W * zoom, height: CANVAS_H * zoom }]}
              onPress={() => setSelectedItemId(null)}
            >
              {/* Grid dots */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {Array.from({ length: 20 }).map((_, row) =>
                  Array.from({ length: 30 }).map((__, col) => (
                    <View
                      key={`${row}-${col}`}
                      style={[
                        styles.gridDot,
                        {
                          top: row * 60 * zoom,
                          left: col * 60 * zoom,
                        },
                      ]}
                    />
                  ))
                )}
              </View>

              {items
                .slice()
                .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                .map((item) => (
                  <BoardItemView
                    key={item.id}
                    item={{ ...item, x: item.x * zoom, y: item.y * zoom }}
                    selected={selectedItemId === item.id}
                    onSelect={handleSelectItem}
                    onMove={(id, x, y) => handleMove(id, x / zoom, y / zoom)}
                    onDelete={handleDelete}
                    onBringToFront={handleBringToFront}
                  />
                ))}

              {items.length === 0 && (
                <View style={styles.emptyCanvas}>
                  <Text style={styles.emptyCanvasEmoji}>🎨</Text>
                  <Text style={styles.emptyCanvasTitle}>Your board is empty</Text>
                  <Text style={styles.emptyCanvasSub}>
                    Tap the toolbar below to add colors, furniture, images, notes, and tags
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </ScrollView>
      </View>

      {/* Bottom toolbar */}
      <View style={[styles.toolbar, { paddingBottom: insets.bottom + 8 }]}>
        {(
          [
            { type: 'color' as SheetType, emoji: '🎨', label: 'Color' },
            { type: 'furniture' as SheetType, emoji: '🛋️', label: 'Furniture' },
            { type: 'image' as SheetType, emoji: '🖼️', label: 'Image' },
            { type: 'note' as SheetType, emoji: '📝', label: 'Note' },
            { type: 'tag' as SheetType, emoji: '🏷️', label: 'Tag' },
          ] as { type: SheetType; emoji: string; label: string }[]
        ).map((btn) => (
          <AnimatedPressable
            key={btn.type}
            onPress={() => {
              console.log('[MoodBoard] Toolbar button pressed:', btn.type);
              setActiveSheet(btn.type);
            }}
            style={styles.toolbarBtn}
          >
            <Text style={styles.toolbarBtnEmoji}>{btn.emoji}</Text>
            <Text style={styles.toolbarBtnLabel}>{btn.label}</Text>
          </AnimatedPressable>
        ))}
      </View>

      {/* ── Add Color Sheet ── */}
      <BottomSheet visible={activeSheet === 'color'} onClose={() => setActiveSheet(null)} maxHeight={480}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>🎨 Add Color</Text>

          <Text style={styles.sheetLabel}>Choose a color</Text>
          <View style={styles.colorGrid}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  console.log('[MoodBoard] Color picker select:', c);
                  setSelectedColor(c);
                  setCustomHex('');
                }}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && !customHex && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>

          <Text style={styles.sheetLabel}>Custom hex</Text>
          <TextInput
            style={styles.input}
            placeholder="#FF5733"
            placeholderTextColor={COLORS.textTertiary}
            value={customHex}
            onChangeText={(v) => {
              setCustomHex(v);
            }}
            autoCapitalize="none"
          />

          <Text style={styles.sheetLabel}>Label (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Accent wall"
            placeholderTextColor={COLORS.textTertiary}
            value={colorLabel}
            onChangeText={setColorLabel}
          />

          <View style={styles.colorPreviewRow}>
            <View
              style={[
                styles.colorPreview,
                { backgroundColor: customHex.startsWith('#') ? customHex : selectedColor },
              ]}
            />
            <Text style={styles.colorPreviewLabel}>
              {customHex.startsWith('#') ? customHex : selectedColor}
            </Text>
          </View>

          <AnimatedPressable onPress={handleAddColor} style={styles.sheetBtn}>
            <Text style={styles.sheetBtnText}>Add to Board</Text>
          </AnimatedPressable>
        </ScrollView>
      </BottomSheet>

      {/* ── Add Furniture Sheet ── */}
      <BottomSheet visible={activeSheet === 'furniture'} onClose={() => setActiveSheet(null)} maxHeight={560}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>🛋️ Add Furniture</Text>

          <TextInput
            style={styles.input}
            placeholder="Search furniture..."
            placeholderTextColor={COLORS.textTertiary}
            value={furnitureSearch}
            onChangeText={(v) => {
              console.log('[MoodBoard] Furniture search:', v);
              setFurnitureSearch(v);
            }}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryRow}
          >
            {FURNITURE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  console.log('[MoodBoard] Furniture category:', cat);
                  setFurnitureCategory(cat);
                }}
                style={[
                  styles.categoryChip,
                  furnitureCategory === cat && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    furnitureCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredFurniture}
            keyExtractor={(f) => f.id}
            numColumns={3}
            style={styles.furnitureList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: f }) => (
              <TouchableOpacity
                onPress={() => handleAddFurniture(f.id)}
                style={styles.furnitureGridItem}
              >
                <Text style={styles.furnitureGridEmoji}>{f.emoji}</Text>
                <Text style={styles.furnitureGridName} numberOfLines={2}>{f.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </BottomSheet>

      {/* ── Add Image Sheet ── */}
      <BottomSheet visible={activeSheet === 'image'} onClose={() => setActiveSheet(null)} maxHeight={500}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>🖼️ Add Inspiration</Text>
          <View style={styles.imageGrid}>
            {INSPIRATION_IMAGES.map((img) => (
              <TouchableOpacity
                key={img.label}
                onPress={() => handleAddImage(img)}
                style={styles.imageGridItem}
              >
                <LinearGradient colors={img.gradient} style={styles.imageGridCard}>
                  <Text style={styles.imageGridEmoji}>{img.emoji}</Text>
                  <Text style={styles.imageGridLabel} numberOfLines={2}>{img.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </BottomSheet>

      {/* ── Add Note Sheet ── */}
      <BottomSheet visible={activeSheet === 'note'} onClose={() => setActiveSheet(null)} maxHeight={420}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>📝 Add Note</Text>

            <TextInput
              style={[styles.noteInput, { backgroundColor: noteColor }]}
              placeholder="Write your note..."
              placeholderTextColor="#888"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.sheetLabel}>Note color</Text>
            <View style={styles.noteColorRow}>
              {NOTE_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    console.log('[MoodBoard] Note color:', NOTE_COLOR_LABELS[i]);
                    setNoteColor(c);
                  }}
                  style={[
                    styles.noteColorDot,
                    { backgroundColor: c },
                    noteColor === c && styles.noteColorDotSelected,
                  ]}
                />
              ))}
            </View>

            <AnimatedPressable onPress={handleAddNote} style={styles.sheetBtn}>
              <Text style={styles.sheetBtnText}>Add Note</Text>
            </AnimatedPressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* ── Add Tag Sheet ── */}
      <BottomSheet visible={activeSheet === 'tag'} onClose={() => setActiveSheet(null)} maxHeight={420}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>🏷️ Add Tag</Text>

          <View style={styles.tagGrid}>
            {PRESET_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => handleAddTag(tag)}
                style={styles.tagGridItem}
              >
                <Text style={styles.tagGridText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sheetLabel}>Custom tag</Text>
          <View style={styles.customTagRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. Japandi"
              placeholderTextColor={COLORS.textTertiary}
              value={customTag}
              onChangeText={setCustomTag}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (customTag.trim()) handleAddTag(customTag.trim());
              }}
            />
            <AnimatedPressable
              onPress={() => {
                if (customTag.trim()) handleAddTag(customTag.trim());
              }}
              style={styles.customTagBtn}
            >
              <Plus size={20} color="#fff" />
            </AnimatedPressable>
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Project selector
  projectScroll: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  projectScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  projectChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  projectChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  projectChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  projectChipTextActive: {
    color: COLORS.primary,
  },
  // Canvas
  canvasWrapper: {
    flex: 1,
    position: 'relative',
  },
  canvasControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 100,
    gap: 8,
  },
  canvasControlBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasControlDanger: {
    borderColor: COLORS.danger + '40',
    backgroundColor: COLORS.danger + '12',
  },
  canvasScroll: {
    flex: 1,
  },
  canvas: {
    backgroundColor: COLORS.surfaceSecondary,
    position: 'relative',
  },
  gridDot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.textTertiary,
    opacity: 0.3,
  },
  emptyCanvas: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyCanvasEmoji: {
    fontSize: 52,
  },
  emptyCanvasTitle: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCanvasSub: {
    color: COLORS.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Board items
  boardItem: {
    position: 'absolute',
  },
  boardItemSelected: {
    opacity: 0.95,
  },
  deleteHandle: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  // Color swatch
  colorSwatch: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'flex-end',
  },
  swatchLabelWrap: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  swatchLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Furniture card
  furnitureCard: {
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  furnitureEmoji: {
    fontSize: 32,
  },
  furnitureName: {
    color: '#1C1917',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  furniturePrice: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  // Image card
  imageCard: {
    width: 130,
    height: 100,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'flex-end',
    gap: 4,
    overflow: 'hidden',
  },
  imageEmoji: {
    fontSize: 28,
  },
  imageLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Note card
  noteCard: {
    width: 120,
    minHeight: 80,
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  noteText: {
    color: '#1C1917',
    fontSize: 12,
    lineHeight: 17,
  },
  // Tag pill
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  toolbarBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  toolbarBtnEmoji: {
    fontSize: 22,
  },
  toolbarBtnLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  // Sheets
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sheetLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -6,
  },
  input: {
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  sheetBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Color sheet
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: COLORS.text,
    transform: [{ scale: 1.15 }],
  },
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorPreviewLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Furniture sheet
  categoryScroll: {
    marginHorizontal: -20,
    marginBottom: -4,
  },
  categoryRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: COLORS.primary,
  },
  furnitureList: {
    maxHeight: 280,
  },
  furnitureGridItem: {
    flex: 1,
    margin: 4,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  furnitureGridEmoji: {
    fontSize: 28,
  },
  furnitureGridName: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Image sheet
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageGridItem: {
    width: (SCREEN_W - 60) / 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imageGridCard: {
    height: 90,
    padding: 12,
    justifyContent: 'flex-end',
    gap: 4,
  },
  imageGridEmoji: {
    fontSize: 22,
  },
  imageGridLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Note sheet
  noteInput: {
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#1C1917',
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  noteColorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  noteColorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  noteColorDotSelected: {
    borderColor: COLORS.text,
    transform: [{ scale: 1.15 }],
  },
  // Tag sheet
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagGridItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagGridText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  customTagBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
