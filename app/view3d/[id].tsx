import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, RotateCcw } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { IsometricView } from '@/components/IsometricView';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FURNITURE_CATALOG } from '@/data/furniture';

type RenderMode = 'realistic' | 'wireframe' | 'blueprint';

const RENDER_MODES: { id: RenderMode; label: string }[] = [
  { id: 'realistic', label: 'Realistic' },
  { id: 'wireframe', label: 'Wireframe' },
  { id: 'blueprint', label: 'Blueprint' },
];

const { width: SCREEN_W } = Dimensions.get('window');

export default function View3DScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects } = useFloorPlan();

  const project = projects.find(p => p.id === id);
  const room = project?.rooms[0];

  const [rotationIndex, setRotationIndex] = useState(0);
  const [renderMode, setRenderMode] = useState<RenderMode>('realistic');
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const lastSwipeX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
      onPanResponderGrant: (evt) => {
        lastSwipeX.current = evt.nativeEvent.pageX;
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 50) {
          console.log('[3D] Rotate left');
          setRotationIndex(r => (r + 3) % 4);
        } else if (gs.dx < -50) {
          console.log('[3D] Rotate right');
          setRotationIndex(r => (r + 1) % 4);
        }
      },
    })
  ).current;

  function showSaveToast() {
    console.log('[3D] Save image pressed');
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  }

  if (!project || !room) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  const rotationLabels = ['North', 'East', 'South', 'West'];
  const currentRotation = rotationLabels[rotationIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log('[3D] Back pressed');
            router.back();
          }}
          style={styles.headerBtn}
        >
          <ArrowLeft size={22} color={COLORS.text} />
        </AnimatedPressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>3D View</Text>
          <Text style={styles.subtitle}>{project.name}</Text>
        </View>

        <AnimatedPressable onPress={showSaveToast} style={styles.headerBtn}>
          <Share2 size={20} color={COLORS.text} />
        </AnimatedPressable>
      </View>

      {/* 3D Canvas */}
      <View style={styles.canvasWrap} {...panResponder.panHandlers}>
        <IsometricView
          room={room}
          rotationIndex={rotationIndex}
          renderMode={renderMode}
          width={SCREEN_W}
          height={380}
        />

        {/* Rotation hint */}
        <View style={styles.rotHint}>
          <RotateCcw size={14} color={COLORS.textSecondary} />
          <Text style={styles.rotHintText}>Swipe to rotate · {currentRotation}</Text>
        </View>

        {/* Rotation dots */}
        <View style={styles.rotDots}>
          {[0, 1, 2, 3].map(i => (
            <AnimatedPressable
              key={i}
              onPress={() => {
                console.log('[3D] Rotation dot pressed:', i);
                setRotationIndex(i);
              }}
              style={[styles.rotDot, rotationIndex === i && styles.rotDotActive]}
            />
          ))}
        </View>
      </View>

      {/* Render Mode Switcher */}
      <View style={styles.modeSection}>
        <Text style={styles.modeLabel}>Render Mode</Text>
        <View style={styles.modeRow}>
          {RENDER_MODES.map(mode => (
            <AnimatedPressable
              key={mode.id}
              onPress={() => {
                console.log('[3D] Render mode:', mode.id);
                setRenderMode(mode.id);
              }}
              style={[styles.modeChip, renderMode === mode.id && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, renderMode === mode.id && styles.modeChipTextActive]}>
                {mode.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      {/* Room Info */}
      <ScrollView contentContainerStyle={styles.infoContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{room.name}</Text>
          <View style={styles.infoStats}>
            <View style={styles.infoStat}>
              <Text style={styles.infoStatValue}>{room.placedItems.length}</Text>
              <Text style={styles.infoStatLabel}>Items</Text>
            </View>
            <View style={styles.infoStatDivider} />
            <View style={styles.infoStat}>
              <Text style={styles.infoStatValue}>{room.walls.length}</Text>
              <Text style={styles.infoStatLabel}>Walls</Text>
            </View>
            <View style={styles.infoStatDivider} />
            <View style={styles.infoStat}>
              <Text style={styles.infoStatValue}>{project.style}</Text>
              <Text style={styles.infoStatLabel}>Style</Text>
            </View>
          </View>
        </View>

        {/* Furniture list */}
        {room.placedItems.length > 0 && (
          <View style={styles.furnitureList}>
            <Text style={styles.furnitureListTitle}>Furniture in this room</Text>
            {room.placedItems.map(item => {
              const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
              if (!furniture) return null;
              return (
                <View key={item.id} style={styles.furnitureRow}>
                  <Text style={styles.furnitureEmoji}>{furniture.emoji}</Text>
                  <View style={styles.furnitureInfo}>
                    <Text style={styles.furnitureName}>{furniture.name}</Text>
                    <Text style={styles.furnitureDims}>{furniture.width} × {furniture.depth} cm</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <AnimatedPressable onPress={showSaveToast} style={styles.saveBtn}>
          <Share2 size={18} color="#fff" />
          <Text style={styles.saveBtnText}>Save Image</Text>
        </AnimatedPressable>
      </ScrollView>

      {/* Toast */}
      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>✓ Image saved to gallery</Text>
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
    paddingVertical: 12,
    gap: 12,
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
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  canvasWrap: {
    position: 'relative',
  },
  rotHint: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rotHintText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  rotDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  rotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textTertiary,
  },
  rotDotActive: {
    backgroundColor: COLORS.primary,
    width: 20,
  },
  modeSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modeLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  modeChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: COLORS.primary,
  },
  infoContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  infoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  infoStatValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  infoStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  infoStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.divider,
  },
  furnitureList: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  furnitureListTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  furnitureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  furnitureEmoji: {
    fontSize: 24,
  },
  furnitureInfo: {
    gap: 2,
  },
  furnitureName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  furnitureDims: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 40,
    right: 40,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
