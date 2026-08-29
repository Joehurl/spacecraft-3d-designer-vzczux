import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ArrowLeft, Zap, ZapOff, X, RotateCcw, Plus, Minus, Save } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { FURNITURE_CATALOG } from '@/data/furniture';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const AR_FURNITURE_IDS = [
  'sofa-001', 'chair-001', 'coffee-001', 'dining-001',
  'desk-001', 'bed-001', 'bookshelf-001', 'tv-stand-001',
];

const AR_CATALOG = AR_FURNITURE_IDS
  .map(id => FURNITURE_CATALOG.find(f => f.id === id))
  .filter(Boolean)
  .concat(
    FURNITURE_CATALOG.filter(f => f.popular).slice(0, 8)
  )
  .filter((f, i, arr) => arr.findIndex(x => x?.id === f?.id) === i)
  .slice(0, 8) as typeof FURNITURE_CATALOG;

interface ARItem {
  id: string;
  furnitureId: string;
  x: Animated.Value;
  y: Animated.Value;
  rotation: number;
  scale: number;
  panX: number;
  panY: number;
}

export default function ARViewScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { projects, addPlacedItem } = useFloorPlan();

  const [torchOn, setTorchOn] = useState(false);
  const [arItems, setArItems] = useState<ARItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(AR_CATALOG[0]?.id ?? '');
  const [scanPhase, setScanPhase] = useState<'scanning' | 'detected'>('scanning');

  // Scanning animation
  const scanOpacity = useRef(new Animated.Value(1)).current;
  const scanScale = useRef(new Animated.Value(0.95)).current;
  const floorBadgeOpacity = useRef(new Animated.Value(0)).current;
  const floorBadgeTranslate = useRef(new Animated.Value(8)).current;
  const gridOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    console.log('[ARView] Screen mounted, projectId:', projectId);
    // Pulsing grid
    const gridLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(gridOpacity, { toValue: 0.15, duration: 800, useNativeDriver: true }),
        Animated.timing(gridOpacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
      ])
    );
    gridLoop.start();

    // After 2s simulate floor detected
    const timer = setTimeout(() => {
      console.log('[ARView] Floor detected simulation triggered');
      setScanPhase('detected');
      gridLoop.stop();
      Animated.parallel([
        Animated.timing(gridOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(floorBadgeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(floorBadgeTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 2200);

    // Floor boundary pulse
    const boundaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanScale, { toValue: 1.01, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanScale, { toValue: 0.99, duration: 1500, useNativeDriver: true }),
      ])
    );
    boundaryLoop.start();

    return () => {
      clearTimeout(timer);
      gridLoop.stop();
      boundaryLoop.stop();
    };
  }, []);

  const createPanResponder = useCallback((item: ARItem) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        console.log('[ARView] Start dragging item:', item.id);
        setSelectedItemId(item.id);
        item.x.setOffset(item.panX);
        item.y.setOffset(item.panY);
        item.x.setValue(0);
        item.y.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: item.x, dy: item.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        item.x.flattenOffset();
        item.y.flattenOffset();
        item.panX = item.panX + gesture.dx;
        item.panY = item.panY + gesture.dy;
        console.log('[ARView] Item dropped at:', item.panX.toFixed(0), item.panY.toFixed(0));
      },
    });
  }, []);

  const handleAddFurniture = useCallback(() => {
    const furniture = FURNITURE_CATALOG.find(f => f.id === selectedFurnitureId);
    if (!furniture) return;
    console.log('[ARView] Add furniture to AR scene:', furniture.name, furniture.id);

    const startX = SCREEN_W / 2 - 40;
    const startY = SCREEN_H * 0.38;

    const newItem: ARItem = {
      id: Math.random().toString(36).substr(2, 9),
      furnitureId: selectedFurnitureId,
      x: new Animated.Value(startX),
      y: new Animated.Value(startY),
      rotation: 0,
      scale: 1,
      panX: startX,
      panY: startY,
    };

    setArItems(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);

    // Entrance animation
    const entranceScale = new Animated.Value(0.3);
    Animated.spring(entranceScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 10,
    }).start();
  }, [selectedFurnitureId]);

  const handleRotateItem = useCallback((itemId: string) => {
    console.log('[ARView] Rotate item:', itemId);
    setArItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, rotation: (item.rotation + 45) % 360 }
          : item
      )
    );
  }, []);

  const handleScaleItem = useCallback((itemId: string, delta: number) => {
    console.log('[ARView] Scale item:', itemId, 'delta:', delta);
    setArItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, scale: Math.max(0.5, Math.min(2.5, item.scale + delta)) }
          : item
      )
    );
  }, []);

  const handleDeleteItem = useCallback((itemId: string) => {
    console.log('[ARView] Delete AR item:', itemId);
    setArItems(prev => prev.filter(i => i.id !== itemId));
    setSelectedItemId(null);
  }, []);

  const saveItemsToProject = useCallback((targetProjectId: string) => {
    const targetProject = projects.find(p => p.id === targetProjectId);
    if (!targetProject) return;
    const targetRoom = targetProject.rooms[0];
    if (!targetRoom) return;
    arItems.forEach(item => {
      console.log('[ARView] Saving item to project:', targetProject.name, 'furnitureId:', item.furnitureId);
      addPlacedItem(targetProject.id, targetRoom.id, {
        furnitureId: item.furnitureId,
        x: 200 + Math.random() * 100,
        y: 200 + Math.random() * 100,
        rotation: item.rotation,
        scale: item.scale,
        color: undefined,
      });
    });
    const count = arItems.length;
    const countLabel = count !== 1 ? 's' : '';
    Alert.alert('Saved!', `${count} item${countLabel} added to "${targetProject.name}".`);
    console.log('[ARView] Saved', count, 'items to project:', targetProject.name);
    router.back();
  }, [arItems, projects, addPlacedItem, router]);

  const handleSaveToProject = useCallback(() => {
    console.log('[ARView] Save to project pressed, projectId:', projectId);
    if (projects.length === 0) {
      Alert.alert('No Project', 'Create a project first to save furniture.');
      return;
    }

    if (projects.length === 1) {
      saveItemsToProject(projects[0].id);
      return;
    }

    const projectChoices = projects.map(p => ({
      text: p.name,
      onPress: () => saveItemsToProject(p.id),
    }));

    Alert.alert(
      'Save to Project',
      'Choose a project to add these furniture items:',
      [
        ...projectChoices,
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [arItems, projects, projectId, saveItemsToProject]);

  const handleToggleTorch = useCallback(() => {
    const next = !torchOn;
    console.log('[ARView] Toggle torch:', next ? 'ON' : 'OFF');
    setTorchOn(next);
  }, [torchOn]);

  const handleBack = useCallback(() => {
    console.log('[ARView] Navigate back');
    router.back();
  }, [router]);

  // Permission denied state
  if (!permission) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permText}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <View style={styles.permIconWrap}>
          <Camera size={40} color={COLORS.accent} />
        </View>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>
          AR Furniture Placement needs your camera to overlay furniture in your space.
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[ARView] Request camera permission');
            requestPermission();
          }}
          style={styles.permBtn}
        >
          <Text style={styles.permBtnText}>Enable Camera</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={handleBack} style={styles.permBackBtn}>
          <Text style={styles.permBackText}>Go Back</Text>
        </AnimatedPressable>
      </View>
    );
  }

  const selectedItem = arItems.find(i => i.id === selectedItemId);
  const selectedFurniture = selectedItem
    ? FURNITURE_CATALOG.find(f => f.id === selectedItem.furnitureId)
    : null;
  const pickerFurniture = FURNITURE_CATALOG.find(f => f.id === selectedFurnitureId);
  const pickerName = pickerFurniture?.name ?? 'Select furniture';

  const FLOOR_RECT_W = SCREEN_W * 0.62;
  const FLOOR_RECT_H = SCREEN_H * 0.38;
  const FLOOR_RECT_X = (SCREEN_W - FLOOR_RECT_W) / 2;
  const FLOOR_RECT_Y = SCREEN_H * 0.22;

  return (
    <View style={styles.root}>
      {/* Camera feed */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
      />

      {/* Scanning grid overlay */}
      <Animated.View
        style={[styles.gridOverlay, { opacity: gridOpacity }]}
        pointerEvents="none"
      >
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => (
            <View
              key={`${row}-${col}`}
              style={[
                styles.gridDot,
                {
                  top: row * (SCREEN_H / 8),
                  left: col * (SCREEN_W / 6),
                },
              ]}
            />
          ))
        )}
        <View style={styles.scanningBadge}>
          <Text style={styles.scanningText}>Scanning room...</Text>
        </View>
      </Animated.View>

      {/* AR Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Floor boundary rectangle */}
        <Animated.View
          style={[
            styles.floorRect,
            {
              width: FLOOR_RECT_W,
              height: FLOOR_RECT_H,
              left: FLOOR_RECT_X,
              top: FLOOR_RECT_Y,
              transform: [{ scale: scanScale }],
            },
          ]}
          pointerEvents="none"
        >
          {/* Floor detected badge */}
          <Animated.View
            style={[
              styles.floorBadge,
              {
                opacity: floorBadgeOpacity,
                transform: [{ translateY: floorBadgeTranslate }],
              },
            ]}
          >
            <Text style={styles.floorBadgeText}>Floor detected ✓</Text>
          </Animated.View>

          {/* Corner accents */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </Animated.View>

        {/* Placed AR items */}
        {arItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture) return null;
          const isSelected = item.id === selectedItemId;
          const panResponder = createPanResponder(item);

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.arItem,
                {
                  transform: [
                    { translateX: item.x },
                    { translateY: item.y },
                    { rotate: `${item.rotation}deg` },
                    { scale: item.scale },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              {/* Selection ring */}
              {isSelected && (
                <View style={styles.selectionRing} />
              )}

              {/* Action buttons */}
              {isSelected && (
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.itemActionBtn}
                    onPress={() => {
                      console.log('[ARView] Scale down item:', item.id);
                      handleScaleItem(item.id, -0.15);
                    }}
                  >
                    <Minus size={12} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.itemActionBtn}
                    onPress={() => handleRotateItem(item.id)}
                  >
                    <RotateCcw size={12} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.itemActionBtn, styles.itemActionDelete]}
                    onPress={() => handleDeleteItem(item.id)}
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.itemActionBtn}
                    onPress={() => {
                      console.log('[ARView] Scale up item:', item.id);
                      handleScaleItem(item.id, 0.15);
                    }}
                  >
                    <Plus size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Shadow glow */}
              <View style={styles.itemShadow} />

              {/* Emoji */}
              <Text style={styles.itemEmoji}>{furniture.emoji}</Text>
              <Text style={styles.itemLabel} numberOfLines={1}>{furniture.name}</Text>
            </Animated.View>
          );
        })}
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <AnimatedPressable onPress={handleBack} style={styles.topBarBtn}>
          <ArrowLeft size={22} color={COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.topBarTitle}>AR Furniture</Text>
        <AnimatedPressable onPress={handleToggleTorch} style={styles.topBarBtn}>
          {torchOn
            ? <Zap size={22} color={COLORS.warning} />
            : <ZapOff size={22} color={COLORS.textSecondary} />
          }
        </AnimatedPressable>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 8 }]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.bottomContent}>
          {/* Selected furniture label */}
          <Text style={styles.pickerLabel} numberOfLines={1}>
            {pickerName}
          </Text>

          {/* Furniture picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerScroll}
          >
            {AR_CATALOG.map(furniture => {
              const isActive = furniture.id === selectedFurnitureId;
              return (
                <AnimatedPressable
                  key={furniture.id}
                  onPress={() => {
                    console.log('[ARView] Select furniture from picker:', furniture.name, furniture.id);
                    setSelectedFurnitureId(furniture.id);
                  }}
                  style={[styles.pickerCard, isActive && styles.pickerCardActive]}
                >
                  <Text style={styles.pickerEmoji}>{furniture.emoji}</Text>
                  <Text style={[styles.pickerName, isActive && styles.pickerNameActive]} numberOfLines={1}>
                    {furniture.name}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <AnimatedPressable onPress={handleAddFurniture} style={styles.addBtn}>
              <LinearGradient
                colors={[COLORS.accent, '#00A88A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addBtnGradient}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add to Room</Text>
              </LinearGradient>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={handleSaveToProject}
              style={[styles.saveBtn, arItems.length === 0 && { opacity: 0.4 }]}
              disabled={arItems.length === 0}
            >
              <Save size={18} color={COLORS.primary} />
              <Text style={styles.saveBtnText}>Save to Project</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Permission
  permContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  permText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  permIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: COLORS.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  permSub: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  permBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  permBackBtn: {
    paddingVertical: 12,
  },
  permBackText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  // Grid overlay
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  gridDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  scanningBadge: {
    position: 'absolute',
    bottom: 220,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,212,170,0.18)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent + '60',
  },
  scanningText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  // Floor boundary
  floorRect: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: COLORS.accent + 'AA',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'rgba(0,212,170,0.04)',
  },
  floorBadge: {
    position: 'absolute',
    top: -16,
    alignSelf: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  floorBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: COLORS.accent,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  // AR items
  arItem: {
    position: 'absolute',
    alignItems: 'center',
    width: 80,
    marginLeft: -40,
    marginTop: -40,
  },
  selectionRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    top: -4,
  },
  itemActions: {
    position: 'absolute',
    top: -44,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  itemActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  itemActionDelete: {
    backgroundColor: COLORS.danger + 'CC',
  },
  itemShadow: {
    position: 'absolute',
    bottom: -6,
    width: 56,
    height: 12,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
    transform: [{ scaleX: 1.1 }],
  },
  itemEmoji: {
    fontSize: 48,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  itemLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    maxWidth: 80,
    overflow: 'hidden',
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: 'hidden',
    zIndex: 20,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 20,
  },
  bottomContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  pickerLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  pickerScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  pickerCard: {
    width: 72,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pickerCardActive: {
    backgroundColor: COLORS.accentMuted,
    borderColor: COLORS.accent,
  },
  pickerEmoji: {
    fontSize: 28,
  },
  pickerName: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerNameActive: {
    color: COLORS.accent,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  addBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
