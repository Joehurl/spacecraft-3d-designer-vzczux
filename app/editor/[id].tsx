import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Undo2,
  Redo2,
  Box,
  Camera,
  MousePointer2,
  Square,
  DoorOpen,
  AppWindow,
  Sofa,
  Ruler,
  Eraser,
  ChevronDown,
  Trash2,
  RotateCcw,
  Share2,
  ShoppingCart,
  History,
  Palette,
  Sparkles,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { useHistory } from '@/contexts/HistoryContext';
import { FloorPlanCanvas, EditorTool } from '@/components/FloorPlanCanvas';
import { ToolButton } from '@/components/ToolButton';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BottomSheet } from '@/components/BottomSheet';
import { ColorPicker } from '@/components/ColorPicker';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { PlacedItem, Wall } from '@/types';
import { CollaboratorAvatar } from '@/components/CollaboratorAvatar';

// Simulated live collaborators shown in the editor
const LIVE_COLLABORATORS = [
  { id: '1', name: 'Alex Chen', color: '#4F8EF7', status: 'editing' as const },
  { id: '2', name: 'Sarah Kim', color: '#00D4AA', status: 'online' as const },
];

interface LiveCursorProps {
  color: string;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  delay: number;
}

function LiveCursor({ color, name, startX, startY, endX, endY, duration, delay }: LiveCursorProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration, delay]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [startX, endX] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [startY, endY] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        liveCursorStyles.dot,
        { backgroundColor: color, transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Text style={liveCursorStyles.label}>{name.split(' ')[0]}</Text>
    </Animated.View>
  );
}

const liveCursorStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  label: {
    position: 'absolute',
    top: 14,
    left: 0,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
});

const { width: SCREEN_W } = Dimensions.get('window');

const FLOOR_COLORS = ['#E8E0D0', '#D4C5B0', '#C8B89A', '#B8A898', '#E0D8C8', '#F0EDE8', '#D8E8D0', '#C8D8E8'];
const WALL_COLORS = ['#F5F5F0', '#F0EDE8', '#E8E4DC', '#FFFFFF', '#F8F4EE', '#EDE8E0', '#E0E8F0', '#F0F0E8'];

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSubscribed } = useSubscription();
  const {
    projects,
    updateProject,
    updateRoom,
    addWall,
    addPlacedItem,
    updatePlacedItem,
    removePlacedItem,
    undo,
    redo,
    undoStack,
    redoStack,
  } = useFloorPlan();
  const { getSnapshotsForProject } = useHistory();

  const project = projects.find(p => p.id === id);
  const room = project?.rooms[0];

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [projectName, setProjectName] = useState(project?.name ?? '');

  useEffect(() => {
    if (project) setProjectName(project.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.name]);

  const selectedItem = room?.placedItems.find(i => i.id === selectedItemId);
  const selectedFurniture = selectedItem ? FURNITURE_CATALOG.find(f => f.id === selectedItem.furnitureId) : null;

  const handleSelectItem = useCallback((itemId: string | null) => {
    setSelectedItemId(itemId);
    if (itemId) {
      setShowProperties(true);
    } else {
      setShowProperties(false);
    }
  }, []);

  const handleAddWall = useCallback((wall: Omit<Wall, 'id'>) => {
    if (!project || !room) return;
    console.log('[Editor] Add wall');
    addWall(project.id, room.id, wall);
  }, [project, room, addWall]);

  const handleUpdatePlacedItem = useCallback((itemId: string, updates: Partial<PlacedItem>) => {
    if (!project || !room) return;
    updatePlacedItem(project.id, room.id, itemId, updates);
  }, [project, room, updatePlacedItem]);

  const handleRemovePlacedItem = useCallback((itemId: string) => {
    if (!project || !room) return;
    console.log('[Editor] Remove placed item:', itemId);
    removePlacedItem(project.id, room.id, itemId);
    setSelectedItemId(null);
    setShowProperties(false);
  }, [project, room, removePlacedItem]);

  const handleOpenFurniturePicker = useCallback(() => {
    console.log('[Editor] Open furniture picker');
    router.push({
      pathname: '/furniture-picker',
      params: { projectId: project?.id, roomId: room?.id },
    });
  }, [router, project, room]);

  const handleToolPress = useCallback((tool: EditorTool) => {
    console.log('[Editor] Tool selected:', tool);
    setActiveTool(tool);
    if (tool === 'furniture') {
      handleOpenFurniturePicker();
    }
  }, [handleOpenFurniturePicker]);

  const handleSaveName = useCallback(() => {
    if (!project) return;
    console.log('[Editor] Save project name:', projectName);
    updateProject(project.id, { name: projectName });
    setEditingName(false);
  }, [project, projectName, updateProject]);

  const handleRotateItem = useCallback(() => {
    if (!selectedItem) return;
    const newRotation = (selectedItem.rotation + 45) % 360;
    console.log('[Editor] Rotate item to:', newRotation);
    handleUpdatePlacedItem(selectedItem.id, { rotation: newRotation });
  }, [selectedItem, handleUpdatePlacedItem]);

  const handleFloorColorChange = useCallback((color: string) => {
    if (!project || !room) return;
    console.log('[Editor] Floor color:', color);
    updateRoom(project.id, room.id, { floorColor: color });
  }, [project, room, updateRoom]);

  const handleWallColorChange = useCallback((color: string) => {
    if (!project || !room) return;
    console.log('[Editor] Wall color:', color);
    updateRoom(project.id, room.id, { wallColor: color });
  }, [project, room, updateRoom]);

  const handleItemColorChange = useCallback((color: string) => {
    if (!selectedItem) return;
    console.log('[Editor] Item color:', color);
    handleUpdatePlacedItem(selectedItem.id, { color });
  }, [selectedItem, handleUpdatePlacedItem]);

  if (!project || !room) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  const projectSnapshots = getSnapshotsForProject(project?.id ?? '');
  const currentVersion = projectSnapshots.length > 0
    ? Math.max(...projectSnapshots.map(s => s.version))
    : 1;
  const versionLabel = 'v' + currentVersion;

  const tools: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 size={20} color={activeTool === 'select' ? COLORS.primary : COLORS.textSecondary} />, label: 'Select' },
    { id: 'wall', icon: <Square size={20} color={activeTool === 'wall' ? COLORS.primary : COLORS.textSecondary} />, label: 'Wall' },
    { id: 'door', icon: <DoorOpen size={20} color={activeTool === 'door' ? COLORS.primary : COLORS.textSecondary} />, label: 'Door' },
    { id: 'window', icon: <AppWindow size={20} color={activeTool === 'window' ? COLORS.primary : COLORS.textSecondary} />, label: 'Window' },
    { id: 'furniture', icon: <Sofa size={20} color={activeTool === 'furniture' ? COLORS.primary : COLORS.textSecondary} />, label: 'Furniture' },
    { id: 'measure', icon: <Ruler size={20} color={activeTool === 'measure' ? COLORS.primary : COLORS.textSecondary} />, label: 'Measure' },
    { id: 'eraser', icon: <Eraser size={20} color={activeTool === 'eraser' ? COLORS.primary : COLORS.textSecondary} />, label: 'Eraser' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Editor] Close editor');
            router.back();
          }}
          style={styles.headerBtn}
        >
          <X size={22} color={COLORS.text} />
        </AnimatedPressable>

        <Pressable onPress={() => setEditingName(true)} style={styles.titleWrap}>
          {editingName ? (
            <TextInput
              style={styles.titleInput}
              value={projectName}
              onChangeText={setProjectName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.title} numberOfLines={1}>{project.name}</Text>
          )}
        </Pressable>

        <View style={styles.headerRight}>
          {/* Collaborator avatars button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Collaborators button pressed — project:', project.id);
              router.push(`/collaborate?projectId=${project.id}`);
            }}
            style={styles.collaboBtn}
          >
            {LIVE_COLLABORATORS.map((c, i) => (
              <View key={c.id} style={[styles.collaboAvatarWrap, { marginLeft: i === 0 ? 0 : -10, zIndex: LIVE_COLLABORATORS.length - i }]}>
                <CollaboratorAvatar name={c.name} color={c.color} size={24} status={c.status} showStatus={false} />
              </View>
            ))}
            <Text style={styles.collaboCount}>2</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Undo');
              undo();
            }}
            style={[styles.headerBtn, undoStack.length === 0 && { opacity: 0.3 }]}
            disabled={undoStack.length === 0}
          >
            <Undo2 size={20} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Redo');
              redo();
            }}
            style={[styles.headerBtn, redoStack.length === 0 && { opacity: 0.3 }]}
            disabled={redoStack.length === 0}
          >
            <Redo2 size={20} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Share button pressed — project:', project.id);
              router.push({ pathname: '/share-design', params: { projectId: project.id } });
            }}
            style={styles.headerBtn}
          >
            <Share2 size={20} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Open AR view for project:', project.id);
              router.push(`/ar-view?projectId=${project.id}`);
            }}
            style={styles.arBtn}
          >
            <Camera size={18} color={COLORS.accent} />
            <Text style={styles.arBtnText}>AR</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Shopping list button pressed — project:', project.id);
              router.push({ pathname: '/shopping-list', params: { projectId: project.id } });
            }}
            style={styles.headerBtn}
          >
            <ShoppingCart size={20} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Smart recommendations button pressed — project:', project.id);
              router.push({ pathname: '/recommendations', params: { projectId: project.id } });
            }}
            style={styles.recommendBtn}
          >
            <Sparkles size={16} color={COLORS.accent} />
            <Text style={styles.recommendBtnText}>✨</Text>
            <View style={styles.recommendBadge}>
              <Text style={styles.recommendBadgeText}>3</Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Mood board button pressed — project:', project.id);
              router.push({ pathname: '/mood-board', params: { projectId: project.id } });
            }}
            style={styles.moodBoardBtn}
          >
            <Palette size={18} color="#A855F7" />
            <Text style={styles.moodBoardBtnText}>Board</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] Open measurements for project:', project.id);
              router.push(`/measurements?projectId=${project.id}`);
            }}
            style={styles.measureBtn}
          >
            <Ruler size={18} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Editor] History button pressed — project:', project.id, 'version:', versionLabel);
              router.push({ pathname: '/design-history', params: { projectId: project.id } });
            }}
            style={styles.historyBtn}
          >
            <History size={16} color={COLORS.text} />
            <Text style={styles.historyBtnText}>{versionLabel}</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              if (!isSubscribed) {
                console.log('[Editor] 3D View blocked — not subscribed, opening paywall');
                router.push('/paywall');
                return;
              }
              console.log('[Editor] Open 3D view');
              router.push(`/view3d/${project.id}`);
            }}
            style={styles.view3dBtn}
          >
            <Box size={18} color="#fff" />
            <Text style={styles.view3dText}>3D</Text>
            {!isSubscribed && (
              <View style={styles.crownBadge}>
                <Text style={styles.crownBadgeText}>👑</Text>
              </View>
            )}
          </AnimatedPressable>
        </View>
      </View>

      {/* Canvas + live cursors overlay */}
      <View style={{ flex: 1 }}>
        <FloorPlanCanvas
          room={room}
          activeTool={activeTool}
          onAddWall={handleAddWall}
          onUpdatePlacedItem={handleUpdatePlacedItem}
          onRemovePlacedItem={handleRemovePlacedItem}
          onSelectItem={handleSelectItem}
          selectedItemId={selectedItemId}
          onOpenFurniturePicker={handleOpenFurniturePicker}
        />
        {/* Simulated live cursors */}
        <LiveCursor color="#4F8EF7" name="Alex Chen" startX={60} startY={80} endX={180} endY={140} duration={3000} delay={0} />
        <LiveCursor color="#00D4AA" name="Sarah Kim" startX={200} startY={60} endX={100} endY={200} duration={3500} delay={800} />
      </View>

      {/* Bottom Toolbar */}
      <View style={[styles.toolbar, { paddingBottom: insets.bottom + 8 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          {tools.map(tool => (
            <ToolButton
              key={tool.id}
              icon={tool.icon}
              label={tool.label}
              active={activeTool === tool.id}
              onPress={() => handleToolPress(tool.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Properties Panel */}
      <BottomSheet
        visible={showProperties && !!selectedItem}
        onClose={() => {
          setShowProperties(false);
          setSelectedItemId(null);
        }}
        maxHeight={380}
      >
        <ScrollView contentContainerStyle={styles.propsContent} showsVerticalScrollIndicator={false}>
          {selectedFurniture && (
            <>
              <View style={styles.propsHeader}>
                <Text style={styles.propsEmoji}>{selectedFurniture.emoji}</Text>
                <View style={styles.propsInfo}>
                  <Text style={styles.propsName}>{selectedFurniture.name}</Text>
                  <Text style={styles.propsDims}>{selectedFurniture.width} × {selectedFurniture.depth} cm</Text>
                </View>
              </View>

              <Text style={styles.propsLabel}>Color</Text>
              <ColorPicker
                colors={selectedFurniture.colors}
                selectedColor={selectedItem?.color}
                onSelect={handleItemColorChange}
              />

              <Text style={styles.propsLabel}>Rotation</Text>
              <View style={styles.rotationRow}>
                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                  <AnimatedPressable
                    key={deg}
                    onPress={() => {
                      console.log('[Editor] Set rotation:', deg);
                      if (selectedItem) handleUpdatePlacedItem(selectedItem.id, { rotation: deg });
                    }}
                    style={[
                      styles.rotBtn,
                      selectedItem?.rotation === deg && styles.rotBtnActive,
                    ]}
                  >
                    <Text style={[styles.rotBtnText, selectedItem?.rotation === deg && { color: COLORS.primary }]}>
                      {deg}°
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>

              <View style={styles.propsActions}>
                <AnimatedPressable onPress={handleRotateItem} style={styles.actionBtn}>
                  <RotateCcw size={18} color={COLORS.text} />
                  <Text style={styles.actionBtnText}>Rotate 45°</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => selectedItem && handleRemovePlacedItem(selectedItem.id)}
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                >
                  <Trash2 size={18} color={COLORS.danger} />
                  <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Remove</Text>
                </AnimatedPressable>
              </View>
            </>
          )}

          {!selectedItem && (
            <>
              <Text style={styles.propsName}>Room Settings</Text>
              <Text style={styles.propsLabel}>Floor color</Text>
              <ColorPicker colors={FLOOR_COLORS} selectedColor={room.floorColor} onSelect={handleFloorColorChange} />
              <Text style={styles.propsLabel}>Wall color</Text>
              <ColorPicker colors={WALL_COLORS} selectedColor={room.wallColor} onSelect={handleWallColorChange} />
            </>
          )}
        </ScrollView>
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
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  titleInput: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: 2,
    minWidth: 120,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accentMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  arBtnText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  measureBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  moodBoardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  moodBoardBtnText: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '700',
  },
  recommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    position: 'relative',
  },
  recommendBtnText: {
    fontSize: 13,
  },
  recommendBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  recommendBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  view3dBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
  },
  view3dText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  crownBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  crownBadgeText: {
    fontSize: 10,
  },
  collaboBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  collaboAvatarWrap: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  collaboCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  toolbar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  toolbarContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  // Properties
  propsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  propsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  propsEmoji: {
    fontSize: 36,
  },
  propsInfo: {
    gap: 2,
  },
  propsName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  propsDims: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  propsLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rotationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rotBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rotBtnActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  rotBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  propsActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnDanger: {
    borderColor: COLORS.danger + '40',
    backgroundColor: COLORS.danger + '12',
  },
  actionBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
