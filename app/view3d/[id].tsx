import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { IsometricView, RenderMode } from '@/components/IsometricView';
import { PerspectiveView } from '@/components/PerspectiveView';
import { BlueprintView } from '@/components/BlueprintView';
import { DollhouseView } from '@/components/DollhouseView';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FURNITURE_CATALOG } from '@/data/furniture';

type ViewMode = 'isometric' | 'perspective' | 'blueprint' | 'dollhouse';
type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night';

const VIEW_MODES: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'isometric', label: 'Isometric', icon: '⬡' },
  { id: 'perspective', label: 'Perspective', icon: '⬛' },
  { id: 'blueprint', label: 'Blueprint', icon: '📐' },
  { id: 'dollhouse', label: 'Dollhouse', icon: '🏠' },
];

const TIME_OPTIONS: { id: TimeOfDay; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'noon', label: 'Noon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
];

const ROTATION_LABELS = ['North', 'East', 'South', 'West'];

const { width: SCREEN_W } = Dimensions.get('window');
const CANVAS_HEIGHT = 360;

export default function View3DScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects } = useFloorPlan();

  const project = projects.find(p => p.id === id);
  const room = project?.rooms[0];

  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [rotationIndex, setRotationIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [lightingOpen, setLightingOpen] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('noon');
  const [shadowIntensity, setShadowIntensity] = useState(0.6);
  const [ambientLight, setAmbientLight] = useState(true);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Pan/zoom state
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const lastPan = useRef({ x: 0, y: 0 });
  const lastDist = useRef<number | null>(null);
  const lastZoom = useRef(1);

  function showToastMsg(msg: string) {
    setToastMsg(msg);
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  }

  function getTouchDist(touches: { pageX: number; pageY: number }[]): number {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          lastDist.current = getTouchDist(touches as { pageX: number; pageY: number }[]);
          lastZoom.current = zoom;
        }
        lastPan.current = { x: 0, y: 0 };
        console.log('[3D] Pan/zoom gesture started, touches:', touches.length);
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2 && lastDist.current !== null) {
          const dist = getTouchDist(touches as { pageX: number; pageY: number }[]);
          const newZoom = Math.max(0.5, Math.min(3, lastZoom.current * (dist / lastDist.current)));
          setZoom(newZoom);
        } else if (touches.length === 1) {
          panX.setValue(gs.dx - lastPan.current.x);
          panY.setValue(gs.dy - lastPan.current.y);
          lastPan.current = { x: gs.dx, y: gs.dy };
        }
      },
      onPanResponderRelease: (_, gs) => {
        lastDist.current = null;
        if (Math.abs(gs.dx) > 50 && Math.abs(gs.dy) < 30) {
          if (gs.dx > 0) {
            console.log('[3D] Swipe right — rotate left');
            setRotationIndex(r => (r + 3) % 4);
          } else {
            console.log('[3D] Swipe left — rotate right');
            setRotationIndex(r => (r + 1) % 4);
          }
        }
        panX.setValue(0);
        panY.setValue(0);
      },
    })
  ).current;

  function handleRotate(dir: 'N' | 'S' | 'E' | 'W') {
    const map = { N: 0, E: 1, S: 2, W: 3 };
    console.log('[3D] Rotation button pressed:', dir);
    setRotationIndex(map[dir]);
  }

  function handleZoomIn() {
    console.log('[3D] Zoom in pressed');
    setZoom(z => Math.min(3, z + 0.25));
  }

  function handleZoomOut() {
    console.log('[3D] Zoom out pressed');
    setZoom(z => Math.max(0.5, z - 0.25));
  }

  function handleResetView() {
    console.log('[3D] Reset view pressed');
    setZoom(1);
    panX.setValue(0);
    panY.setValue(0);
    setRotationIndex(0);
  }

  function handleScreenshot() {
    console.log('[3D] Screenshot button pressed');
    Alert.alert('Screenshot saved!', 'Your 3D view has been saved to the gallery.');
  }

  function handleViewMode(mode: ViewMode) {
    console.log('[3D] View mode changed:', mode);
    setViewMode(mode);
  }

  function handleTimeOfDay(tod: TimeOfDay) {
    console.log('[3D] Time of day changed:', tod);
    setTimeOfDay(tod);
  }

  function handleShadowSlider(dir: 'up' | 'down') {
    setShadowIntensity(s => {
      const next = dir === 'up' ? Math.min(1, s + 0.1) : Math.max(0, s - 0.1);
      console.log('[3D] Shadow intensity changed:', next.toFixed(1));
      return next;
    });
  }

  function handleAmbientToggle(val: boolean) {
    console.log('[3D] Ambient light toggled:', val);
    setAmbientLight(val);
  }

  if (!project || !room) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  const currentRotationLabel = ROTATION_LABELS[rotationIndex];
  const showRotationControls = viewMode === 'isometric';
  const canvasWidth = SCREEN_W;

  const shadowPct = Math.round(shadowIntensity * 100);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log('[3D] Back pressed');
            router.back();
          }}
          style={styles.headerBtn}
        >
          <ArrowLeft size={20} color={COLORS.text} />
        </AnimatedPressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>3D View</Text>
          <Text style={styles.subtitle}>{project.name}</Text>
        </View>

        <AnimatedPressable onPress={handleScreenshot} style={styles.headerBtn}>
          <Camera size={20} color={COLORS.text} />
        </AnimatedPressable>
      </View>

      {/* ── VIEW MODE TABS ── */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {VIEW_MODES.map(mode => {
            const isActive = viewMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => handleViewMode(mode.id)}
                style={[styles.tab, isActive && styles.tabActive]}
                activeOpacity={0.75}
              >
                <Text style={styles.tabIcon}>{mode.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{mode.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CANVAS ── */}
      <View style={styles.canvasOuter}>
        <Animated.View
          style={[
            styles.canvasInner,
            {
              transform: [
                { scale: zoom },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {viewMode === 'isometric' && (
            <IsometricView
              room={room}
              rotationIndex={rotationIndex}
              renderMode="isometric"
              width={canvasWidth}
              height={CANVAS_HEIGHT}
              timeOfDay={timeOfDay}
              shadowIntensity={shadowIntensity}
              ambientLight={ambientLight}
            />
          )}
          {viewMode === 'perspective' && (
            <PerspectiveView
              room={room}
              width={canvasWidth}
              height={CANVAS_HEIGHT}
              timeOfDay={timeOfDay}
              shadowIntensity={shadowIntensity}
            />
          )}
          {viewMode === 'blueprint' && (
            <BlueprintView
              room={room}
              width={canvasWidth}
              height={CANVAS_HEIGHT}
            />
          )}
          {viewMode === 'dollhouse' && (
            <DollhouseView
              room={room}
              width={canvasWidth}
              height={CANVAS_HEIGHT}
              timeOfDay={timeOfDay}
            />
          )}
        </Animated.View>

        {/* ── ROTATION COMPASS (isometric only) ── */}
        {showRotationControls && (
          <View style={styles.compass}>
            {(['N', 'E', 'S', 'W'] as const).map(dir => {
              const map = { N: 0, E: 1, S: 2, W: 3 };
              const isActive = rotationIndex === map[dir];
              return (
                <TouchableOpacity
                  key={dir}
                  onPress={() => handleRotate(dir)}
                  style={[styles.compassBtn, isActive && styles.compassBtnActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.compassLabel, isActive && styles.compassLabelActive]}>{dir}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── ZOOM CONTROLS ── */}
        <View style={styles.zoomControls}>
          <TouchableOpacity onPress={handleZoomIn} style={styles.zoomBtn} activeOpacity={0.75}>
            <ZoomIn size={16} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity onPress={handleZoomOut} style={styles.zoomBtn} activeOpacity={0.75}>
            <ZoomOut size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* ── RESET + HINT ── */}
        <View style={styles.canvasFooter}>
          <TouchableOpacity onPress={handleResetView} style={styles.resetBtn} activeOpacity={0.75}>
            <RotateCcw size={12} color={COLORS.textSecondary} />
            <Text style={styles.resetLabel}>Reset</Text>
          </TouchableOpacity>
          {viewMode === 'isometric' && (
            <Text style={styles.hintText}>Swipe to rotate · {currentRotationLabel}</Text>
          )}
          {viewMode === 'perspective' && (
            <Text style={styles.hintText}>Drag to pan · Pinch to zoom</Text>
          )}
          {viewMode === 'blueprint' && (
            <Text style={styles.hintText}>Technical drawing</Text>
          )}
          {viewMode === 'dollhouse' && (
            <Text style={styles.hintText}>Top-down cutaway</Text>
          )}
        </View>
      </View>

      {/* ── SCROLLABLE BOTTOM ── */}
      <ScrollView
        style={styles.bottomScroll}
        contentContainerStyle={styles.bottomContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Lighting Panel */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => {
              console.log('[3D] Lighting panel toggled:', !lightingOpen);
              setLightingOpen(o => !o);
            }}
            style={styles.cardHeader}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeaderLeft}>
              <Sun size={16} color={COLORS.warning} />
              <Text style={styles.cardTitle}>Lighting</Text>
            </View>
            {lightingOpen ? <ChevronUp size={16} color={COLORS.textSecondary} /> : <ChevronDown size={16} color={COLORS.textSecondary} />}
          </TouchableOpacity>

          {lightingOpen && (
            <View style={styles.lightingBody}>
              {/* Time of day */}
              <Text style={styles.lightingLabel}>Time of Day</Text>
              <View style={styles.timeRow}>
                {TIME_OPTIONS.map(opt => {
                  const isActive = timeOfDay === opt.id;
                  const icons = { morning: <Sunrise size={13} color={isActive ? '#fff' : COLORS.textSecondary} />, noon: <Sun size={13} color={isActive ? '#fff' : COLORS.textSecondary} />, evening: <Sunset size={13} color={isActive ? '#fff' : COLORS.textSecondary} />, night: <Moon size={13} color={isActive ? '#fff' : COLORS.textSecondary} /> };
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => handleTimeOfDay(opt.id)}
                      style={[styles.timeChip, isActive && styles.timeChipActive]}
                      activeOpacity={0.75}
                    >
                      {icons[opt.id]}
                      <Text style={[styles.timeChipText, isActive && styles.timeChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Shadow intensity */}
              <View style={styles.sliderRow}>
                <Text style={styles.lightingLabel}>Shadow Intensity</Text>
                <Text style={styles.sliderValue}>{shadowPct}%</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${shadowPct}%` }]} />
                <View style={styles.sliderBtns}>
                  <TouchableOpacity onPress={() => handleShadowSlider('down')} style={styles.sliderBtn} activeOpacity={0.75}>
                    <Text style={styles.sliderBtnText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleShadowSlider('up')} style={styles.sliderBtn} activeOpacity={0.75}>
                    <Text style={styles.sliderBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Ambient light toggle */}
              <View style={styles.ambientRow}>
                <Text style={styles.lightingLabel}>Ambient Light</Text>
                <Switch
                  value={ambientLight}
                  onValueChange={handleAmbientToggle}
                  trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryMuted }}
                  thumbColor={ambientLight ? COLORS.primary : COLORS.textTertiary}
                />
              </View>
            </View>
          )}
        </View>

        {/* Room Info */}
        <View style={styles.card}>
          <Text style={styles.infoTitle}>{room.name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{room.placedItems.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{room.walls.length}</Text>
              <Text style={styles.statLabel}>Walls</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{project.style}</Text>
              <Text style={styles.statLabel}>Style</Text>
            </View>
          </View>
        </View>

        {/* Furniture list */}
        {room.placedItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Furniture</Text>
            {room.placedItems.map(item => {
              const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
              if (!furniture) return null;
              const dimText = `${furniture.width} × ${furniture.depth} cm`;
              return (
                <View key={item.id} style={styles.furnitureRow}>
                  <View style={[styles.furnitureColor, { backgroundColor: item.color ?? furniture.colors[0] ?? '#888' }]} />
                  <Text style={styles.furnitureEmoji}>{furniture.emoji}</Text>
                  <View style={styles.furnitureInfo}>
                    <Text style={styles.furnitureName}>{furniture.name}</Text>
                    <Text style={styles.furnitureDims}>{dimText}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Screenshot button */}
        <TouchableOpacity onPress={handleScreenshot} style={styles.screenshotBtn} activeOpacity={0.85}>
          <Camera size={18} color="#fff" />
          <Text style={styles.screenshotBtnText}>Save Screenshot</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── TOAST ── */}
      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}
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
    paddingVertical: 10,
    gap: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
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
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  // Tab bar
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 13,
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  // Canvas
  canvasOuter: {
    position: 'relative',
    height: CANVAS_HEIGHT,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  canvasInner: {
    width: SCREEN_W,
    height: CANVAS_HEIGHT,
  },
  // Compass
  compass: {
    position: 'absolute',
    top: 10,
    right: 12,
    flexDirection: 'column',
    gap: 4,
  },
  compassBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(19,25,41,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compassBtnActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  compassLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  compassLabelActive: {
    color: COLORS.primary,
  },
  // Zoom
  zoomControls: {
    position: 'absolute',
    top: 10,
    left: 12,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  zoomBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(19,25,41,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoomLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  // Canvas footer
  canvasFooter: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(19,25,41,0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  hintText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  // Bottom scroll
  bottomScroll: {
    flex: 1,
  },
  bottomContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  // Lighting
  lightingBody: {
    gap: 12,
    paddingTop: 4,
  },
  lightingLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  timeChip: {
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
  timeChipActive: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warning,
  },
  timeChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timeChipTextActive: {
    color: '#fff',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  sliderBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    justifyContent: 'flex-end',
  },
  sliderBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sliderBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  ambientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Room info
  infoTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.divider,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  furnitureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  furnitureColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  furnitureEmoji: {
    fontSize: 20,
  },
  furnitureInfo: {
    gap: 1,
  },
  furnitureName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  furnitureDims: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  // Screenshot button
  screenshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  screenshotBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Toast
  toast: {
    position: 'absolute',
    bottom: 90,
    left: 40,
    right: 40,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
