import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Share,
  Linking,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Share2,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  Circle,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BottomSheet } from '@/components/BottomSheet';
import { FloorPlan } from '@/types';
import {
  ShoppingListItem,
  generateShoppingList,
  calculateTotal,
  formatShoppingListAsText,
  groupByCategory,
} from '@/utils/shoppingListUtils';
import { CATEGORY_COLORS } from '@/data/furniture';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_PREFIX = '@spacecraft3d_shopping_';

function storageKey(projectId: string) {
  return `${STORAGE_PREFIX}${projectId}`;
}

interface PersistedState {
  purchased: Record<string, boolean>;
  quantities: Record<string, number>;
  customItems: ShoppingListItem[];
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function ShoppingListScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects } = useFloorPlan();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId ?? null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [loaded, setLoaded] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

  // Auto-select first project if none provided
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      console.log('[ShoppingList] Auto-selecting first project:', projects[0].id);
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Generate list when project changes
  useEffect(() => {
    if (!selectedProject) {
      setItems([]);
      setLoaded(true);
      return;
    }
    const project = selectedProject;
    console.log('[ShoppingList] Loading list for project:', project.id);
    const generated = generateShoppingList(project);

    // Load persisted state
    AsyncStorage.getItem(storageKey(project.id))
      .then(raw => {
        const persisted: PersistedState = raw
          ? JSON.parse(raw)
          : { purchased: {}, quantities: {}, customItems: [] };

        const merged = generated.map(item => ({
          ...item,
          purchased: persisted.purchased[item.id] ?? false,
          quantity: persisted.quantities[item.id] ?? item.quantity,
        }));

        const allItems = [...merged, ...(persisted.customItems ?? [])];
        setItems(allItems);
        setLoaded(true);
        console.log('[ShoppingList] Loaded', allItems.length, 'items (', persisted.customItems?.length ?? 0, 'custom)');
      })
      .catch(() => {
        setItems(generated);
        setLoaded(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  // Persist state whenever items change
  useEffect(() => {
    if (!selectedProjectId || !loaded) return;
    const purchased: Record<string, boolean> = {};
    const quantities: Record<string, number> = {};
    const customItems: ShoppingListItem[] = [];

    for (const item of items) {
      purchased[item.id] = item.purchased;
      quantities[item.id] = item.quantity;
      if (item.id.startsWith('custom_')) {
        customItems.push(item);
      }
    }

    const state: PersistedState = { purchased, quantities, customItems };
    AsyncStorage.setItem(storageKey(selectedProjectId), JSON.stringify(state)).catch(() => {});
  }, [items, selectedProjectId, loaded]);

  const togglePurchased = useCallback((id: string) => {
    console.log('[ShoppingList] Toggle purchased:', id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems(prev => prev.map(item => item.id === id ? { ...item, purchased: !item.purchased } : item));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    console.log('[ShoppingList] Update quantity:', id, delta > 0 ? '+1' : '-1');
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty };
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    console.log('[ShoppingList] Remove item:', id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearPurchased = useCallback(() => {
    console.log('[ShoppingList] Clear purchased items');
    const purchasedCount = items.filter(i => i.purchased).length;
    if (purchasedCount === 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems(prev => prev.filter(item => !item.purchased));
  }, [items]);

  const handleFindIt = useCallback((itemName: string) => {
    const query = encodeURIComponent(itemName + ' furniture');
    const url = `https://www.google.com/search?q=${query}`;
    console.log('[ShoppingList] Find it pressed for:', itemName, '→', url);
    Linking.openURL(url).catch(() => {
      console.log('[ShoppingList] Failed to open URL:', url);
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!selectedProject) return;
    console.log('[ShoppingList] Share list pressed for project:', selectedProject.id);
    const text = formatShoppingListAsText(selectedProject, items);
    try {
      await Share.share({ message: text, title: `Shopping List — ${selectedProject.name}` });
      console.log('[ShoppingList] Share sheet opened');
    } catch (e) {
      console.log('[ShoppingList] Share failed:', e);
    }
  }, [selectedProject, items]);

  const handleExportPDF = useCallback(() => {
    console.log('[ShoppingList] Export PDF pressed');
    Alert.alert('PDF Export', 'PDF export coming soon!');
  }, []);

  const handleAddCustomItem = useCallback(() => {
    const name = customName.trim();
    const price = parseFloat(customPrice) || 0;
    if (!name) return;
    console.log('[ShoppingList] Add custom item:', name, '$' + price);
    const newItem: ShoppingListItem = {
      id: `custom_${Date.now()}`,
      furnitureId: 'custom',
      name,
      emoji: '📦',
      category: 'decor',
      width: 0,
      depth: 0,
      height: 0,
      price,
      quantity: 1,
      purchased: false,
      roomName: 'Custom',
    };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems(prev => [...prev, newItem]);
    setCustomName('');
    setCustomPrice('');
    setShowAddCustom(false);
  }, [customName, customPrice]);

  const toggleCategory = useCallback((category: string) => {
    console.log('[ShoppingList] Toggle category collapse:', category);
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const handleSelectProject = useCallback((project: FloorPlan) => {
    console.log('[ShoppingList] Select project:', project.id, project.name);
    setSelectedProjectId(project.id);
    setLoaded(false);
  }, []);

  const grouped = groupByCategory(items);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = calculateTotal(items);
  const purchasedCount = items.filter(i => i.purchased).length;
  const totalFormatted = `$${totalPrice.toLocaleString()}`;
  const progressPct = items.length > 0 ? purchasedCount / items.length : 0;

  // ─── Empty states ──────────────────────────────────────────────────────────
  if (projects.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => { console.log('[ShoppingList] Close'); router.back(); }} style={styles.headerBtn}>
            <X size={22} color={COLORS.text} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>🛒 Shopping List</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <ShoppingCart size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No designs yet</Text>
          <Text style={styles.emptySub}>Create a floor plan first, then generate your shopping list</Text>
          <AnimatedPressable
            onPress={() => { console.log('[ShoppingList] Navigate to projects'); router.replace('/(tabs)/(projects)'); }}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnText}>Create a design</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => { console.log('[ShoppingList] Close'); router.back(); }}
          style={styles.headerBtn}
        >
          <X size={22} color={COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>🛒 Shopping List</Text>
        <AnimatedPressable onPress={handleShare} style={styles.headerBtn}>
          <Share2 size={20} color={COLORS.primary} />
        </AnimatedPressable>
      </View>

      {/* Project selector (if multiple projects) */}
      {projects.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.projectChips}
        >
          {projects.map(p => {
            const isSelected = p.id === selectedProjectId;
            return (
              <AnimatedPressable
                key={p.id}
                onPress={() => handleSelectProject(p)}
                style={[styles.projectChip, isSelected && styles.projectChipActive]}
              >
                <Text style={[styles.projectChipText, isSelected && styles.projectChipTextActive]} numberOfLines={1}>
                  {p.name}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      )}

      {/* Summary bar */}
      {items.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryCount}>{totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
            <Text style={styles.summaryDot}>·</Text>
            <Text style={styles.summaryTotal}>{totalFormatted}</Text>
            {purchasedCount > 0 && (
              <>
                <Text style={styles.summaryDot}>·</Text>
                <Text style={styles.summaryPurchased}>{purchasedCount} bought</Text>
              </>
            )}
          </View>
          <AnimatedPressable onPress={handleExportPDF} style={styles.exportBtn}>
            <FileText size={14} color={COLORS.textSecondary} />
            <Text style={styles.exportBtnText}>PDF</Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Progress bar */}
      {items.length > 0 && purchasedCount > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{Math.round(progressPct * 100)}% purchased</Text>
        </View>
      )}

      {/* No furniture empty state */}
      {loaded && items.length === 0 && selectedProject && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <ShoppingCart size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No furniture in this design</Text>
          <Text style={styles.emptySub}>Add furniture to your floor plan to generate a shopping list</Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[ShoppingList] Open editor for project:', selectedProject.id);
              router.push(`/editor/${selectedProject.id}`);
            }}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnText}>Open editor</Text>
          </AnimatedPressable>
        </View>
      )}

      {/* List */}
      {items.length > 0 && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 160 }]}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(grouped).map(([category, catItems], catIndex) => {
            const isCollapsed = collapsedCategories.has(category);
            const catTotal = calculateTotal(catItems);
            const catLabel = category.charAt(0).toUpperCase() + category.slice(1);
            const catColor = CATEGORY_COLORS[category] ?? COLORS.primary;
            const catTotalFormatted = `$${catTotal.toLocaleString()}`;

            return (
              <AnimatedListItem key={category} index={catIndex}>
                <View style={styles.categorySection}>
                  {/* Category header */}
                  <AnimatedPressable
                    onPress={() => toggleCategory(category)}
                    style={styles.categoryHeader}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                    <Text style={[styles.categoryLabel, { color: catColor }]}>{catLabel}</Text>
                    <Text style={styles.categorySubtotal}>{catTotalFormatted}</Text>
                    <View style={styles.categoryChevron}>
                      {isCollapsed
                        ? <ChevronRight size={16} color={COLORS.textTertiary} />
                        : <ChevronDown size={16} color={COLORS.textTertiary} />
                      }
                    </View>
                  </AnimatedPressable>

                  {/* Items */}
                  {!isCollapsed && catItems.map((item, itemIndex) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={itemIndex}
                      onTogglePurchased={togglePurchased}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeItem}
                      onFindIt={handleFindIt}
                    />
                  ))}
                </View>
              </AnimatedListItem>
            );
          })}
        </ScrollView>
      )}

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomRow}>
          <AnimatedPressable
            onPress={() => {
              console.log('[ShoppingList] Add custom item pressed');
              setShowAddCustom(true);
            }}
            style={styles.addCustomBtn}
          >
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.addCustomBtnText}>Add custom item</Text>
          </AnimatedPressable>

          {purchasedCount > 0 && (
            <AnimatedPressable onPress={clearPurchased} style={styles.clearBtn}>
              <Trash2 size={16} color={COLORS.danger} />
              <Text style={styles.clearBtnText}>Clear purchased</Text>
            </AnimatedPressable>
          )}
        </View>

        <AnimatedPressable onPress={handleShare} style={styles.shareBtn}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareBtnGradient}
          >
            <Share2 size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Share list</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>

      {/* Add custom item sheet */}
      <BottomSheet visible={showAddCustom} onClose={() => setShowAddCustom(false)} maxHeight={320}>
        <View style={styles.customSheetContent}>
          <Text style={styles.customSheetTitle}>Add custom item</Text>

          <Text style={styles.inputLabel}>Item name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Custom shelving unit"
            placeholderTextColor={COLORS.textTertiary}
            value={customName}
            onChangeText={setCustomName}
            autoFocus
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Price (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 299"
            placeholderTextColor={COLORS.textTertiary}
            value={customPrice}
            onChangeText={setCustomPrice}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleAddCustomItem}
          />

          <AnimatedPressable
            onPress={handleAddCustomItem}
            style={[styles.addItemBtn, !customName.trim() && { opacity: 0.5 }]}
            disabled={!customName.trim()}
          >
            <Text style={styles.addItemBtnText}>Add to list</Text>
          </AnimatedPressable>
        </View>
      </BottomSheet>
    </View>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: ShoppingListItem;
  index: number;
  onTogglePurchased: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onFindIt: (name: string) => void;
}

function ItemRow({ item, index, onTogglePurchased, onUpdateQuantity, onRemove, onFindIt }: ItemRowProps) {
  const itemPrice = item.price * item.quantity;
  const itemPriceFormatted = `$${itemPrice.toLocaleString()}`;
  const dimsText = item.width > 0 ? `W${item.width} × D${item.depth} × H${item.height} cm` : '';
  const strikeStyle = item.purchased ? styles.strikethrough : undefined;

  return (
    <View style={[styles.itemRow, item.purchased && styles.itemRowPurchased]}>
      {/* Checkbox */}
      <AnimatedPressable
        onPress={() => onTogglePurchased(item.id)}
        style={styles.checkbox}
        accessibilityLabel={item.purchased ? 'Mark as not purchased' : 'Mark as purchased'}
      >
        {item.purchased
          ? <CheckCircle2 size={22} color={COLORS.success} />
          : <Circle size={22} color={COLORS.textTertiary} />
        }
      </AnimatedPressable>

      {/* Emoji */}
      <Text style={styles.itemEmoji}>{item.emoji}</Text>

      {/* Info */}
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, strikeStyle]} numberOfLines={1}>{item.name}</Text>
        {dimsText ? <Text style={styles.itemDims}>{dimsText}</Text> : null}
        <Text style={styles.itemRoom}>{item.roomName}</Text>
      </View>

      {/* Right side */}
      <View style={styles.itemRight}>
        <Text style={[styles.itemPrice, strikeStyle]}>{itemPriceFormatted}</Text>

        {/* Quantity stepper */}
        <View style={styles.stepper}>
          <AnimatedPressable
            onPress={() => onUpdateQuantity(item.id, -1)}
            style={styles.stepperBtn}
            accessibilityLabel="Decrease quantity"
          >
            <Minus size={12} color={COLORS.text} />
          </AnimatedPressable>
          <Text style={styles.stepperCount}>{item.quantity}</Text>
          <AnimatedPressable
            onPress={() => onUpdateQuantity(item.id, 1)}
            style={styles.stepperBtn}
            accessibilityLabel="Increase quantity"
          >
            <Plus size={12} color={COLORS.text} />
          </AnimatedPressable>
        </View>

        {/* Actions */}
        <View style={styles.itemActions}>
          <AnimatedPressable
            onPress={() => onFindIt(item.name)}
            style={styles.findBtn}
            accessibilityLabel={`Find ${item.name} online`}
          >
            <ExternalLink size={13} color={COLORS.primary} />
            <Text style={styles.findBtnText}>Find it</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => onRemove(item.id)}
            style={styles.removeBtn}
            accessibilityLabel={`Remove ${item.name}`}
          >
            <Trash2 size={14} color={COLORS.danger} />
          </AnimatedPressable>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // Project chips
  projectChips: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  projectChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    maxWidth: 180,
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
  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryCount: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryDot: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  summaryTotal: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryPurchased: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exportBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  // Progress
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceTertiary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.success,
  },
  progressLabel: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    gap: 8,
  },
  // Category section
  categorySection: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  categorySubtotal: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChevron: {
    width: 20,
    alignItems: 'center',
  },
  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemRowPurchased: {
    opacity: 0.55,
  },
  checkbox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: {
    fontSize: 32,
    width: 40,
    textAlign: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemDims: {
    color: COLORS.textTertiary,
    fontSize: 11,
  },
  itemRoom: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: COLORS.textTertiary,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemPrice: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCount: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.primaryMuted,
  },
  findBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: COLORS.danger + '18',
  },
  // Bottom bar
  bottomBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addCustomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  addCustomBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.danger + '18',
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
  },
  clearBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  shareBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Custom item sheet
  customSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  customSheetTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addItemBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  addItemBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
