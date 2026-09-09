import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BottomSheet } from '@/components/BottomSheet';
import { Room, FloorPlan } from '@/types';

type StyleKey = FloorPlan['style'];

const STYLE_PALETTES: Record<StyleKey, { name: string; colors: string[] }[]> = {
  modern: [
    { name: 'Concrete & Steel', colors: ['#F5F5F0', '#E8E8E0', '#9CA3AF', '#374151', '#1C1917'] },
    { name: 'Midnight Blue', colors: ['#F0F4FF', '#BFDBFE', '#3B82F6', '#1D4ED8', '#0F172A'] },
    { name: 'Warm White', colors: ['#FAFAF8', '#F5F0E8', '#D4C5A9', '#8B7355', '#3D2B1F'] },
  ],
  scandinavian: [
    { name: 'Nordic Frost', colors: ['#F8FAFC', '#E2E8F0', '#94A3B8', '#475569', '#1E293B'] },
    { name: 'Forest Cabin', colors: ['#F0FDF4', '#BBF7D0', '#4ADE80', '#166534', '#052E16'] },
    { name: 'Birch & Linen', colors: ['#FEFCE8', '#FEF9C3', '#D4C5A9', '#92400E', '#3D2B1F'] },
  ],
  industrial: [
    { name: 'Raw Steel', colors: ['#F9FAFB', '#D1D5DB', '#6B7280', '#374151', '#111827'] },
    { name: 'Rust & Iron', colors: ['#FFF7ED', '#FED7AA', '#F97316', '#9A3412', '#431407'] },
    { name: 'Exposed Brick', colors: ['#FEF2F2', '#FECACA', '#EF4444', '#7F1D1D', '#1C0A0A'] },
  ],
  bohemian: [
    { name: 'Desert Bloom', colors: ['#FFFBEB', '#FDE68A', '#F59E0B', '#B45309', '#78350F'] },
    { name: 'Jewel Tones', colors: ['#F5F3FF', '#DDD6FE', '#8B5CF6', '#5B21B6', '#2E1065'] },
    { name: 'Terracotta', colors: ['#FFF7ED', '#FDBA74', '#EA580C', '#9A3412', '#431407'] },
  ],
  minimalist: [
    { name: 'Pure White', colors: ['#FFFFFF', '#F9FAFB', '#E5E7EB', '#9CA3AF', '#374151'] },
    { name: 'Warm Greige', colors: ['#FAFAF8', '#F5F0E8', '#E8DDD0', '#C4B5A0', '#8B7355'] },
    { name: 'Ink & Paper', colors: ['#FAFAFA', '#E5E5E5', '#A3A3A3', '#404040', '#171717'] },
  ],
  classic: [
    { name: 'Heritage Oak', colors: ['#FEFCE8', '#FEF3C7', '#D97706', '#92400E', '#3D2B1F'] },
    { name: 'Navy & Gold', colors: ['#EFF6FF', '#BFDBFE', '#1D4ED8', '#1E3A5F', '#F59E0B'] },
    { name: 'Sage & Cream', colors: ['#F0FDF4', '#DCFCE7', '#86EFAC', '#166534', '#F5F0E8'] },
  ],
};

const STYLE_LABELS: Record<StyleKey, string> = {
  modern: 'Modern',
  scandinavian: 'Scandinavian',
  industrial: 'Industrial',
  bohemian: 'Bohemian',
  minimalist: 'Minimalist',
  classic: 'Classic',
};

const ALL_STYLES: StyleKey[] = ['modern', 'scandinavian', 'industrial', 'bohemian', 'minimalist', 'classic'];

export default function PaletteExtractorScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects, updateRoom } = useFloorPlan();

  const project = projects.find(p => p.id === projectId);

  const [selectedStyle, setSelectedStyle] = useState<StyleKey>(project?.style ?? 'modern');
  const [selectedPalette, setSelectedPalette] = useState<{ name: string; colors: string[] } | null>(null);
  const [showApplySheet, setShowApplySheet] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [applyWall, setApplyWall] = useState(true);
  const [applyFloor, setApplyFloor] = useState(true);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const palettes = useMemo(() => STYLE_PALETTES[selectedStyle] ?? [], [selectedStyle]);

  const handleCopyHex = useCallback(async (hex: string) => {
    console.log('[PaletteExtractor] Copy hex:', hex);
    await Clipboard.setStringAsync(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  }, []);

  const handleApplyPalette = useCallback((palette: { name: string; colors: string[] }) => {
    console.log('[PaletteExtractor] Apply palette pressed:', palette.name);
    setSelectedPalette(palette);
    setSelectedRooms(new Set());
    setShowApplySheet(true);
  }, []);

  const handleToggleRoom = useCallback((roomId: string) => {
    console.log('[PaletteExtractor] Toggle room selection:', roomId);
    setSelectedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  }, []);

  const handleConfirmApply = useCallback(() => {
    if (!project || !selectedPalette) return;
    console.log('[PaletteExtractor] Confirm apply palette:', selectedPalette.name, 'to rooms:', Array.from(selectedRooms));
    selectedRooms.forEach(roomId => {
      const updates: Partial<Room> = {};
      if (applyWall) updates.wallColor = selectedPalette.colors[0];
      if (applyFloor) updates.floorColor = selectedPalette.colors[selectedPalette.colors.length - 1];
      if (Object.keys(updates).length > 0) {
        updateRoom(project.id, roomId, updates);
      }
    });
    setShowApplySheet(false);
    Alert.alert('Palette Applied!', `"${selectedPalette.name}" has been applied to ${selectedRooms.size} room${selectedRooms.size !== 1 ? 's' : ''}.`);
  }, [project, selectedPalette, selectedRooms, applyWall, applyFloor, updateRoom]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Color Palettes</Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[PaletteExtractor] Close pressed');
            router.back();
          }}
          style={styles.closeBtn}
        >
          <X size={20} color={COLORS.text} />
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Style Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.styleRow}
        >
          {ALL_STYLES.map(style => {
            const isActive = selectedStyle === style;
            return (
              <AnimatedPressable
                key={style}
                onPress={() => {
                  console.log('[PaletteExtractor] Style selected:', style);
                  setSelectedStyle(style);
                }}
                style={[styles.styleChip, isActive && styles.styleChipActive]}
              >
                <Text style={[styles.styleChipText, isActive && styles.styleChipTextActive]}>
                  {STYLE_LABELS[style]}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Palettes */}
        <View style={styles.palettesSection}>
          {palettes.map(palette => (
            <View key={palette.name} style={styles.paletteCard}>
              {/* Swatches */}
              <View style={styles.swatchRow}>
                {palette.colors.map((color, i) => (
                  <View
                    key={i}
                    style={[styles.swatch, { backgroundColor: color }]}
                  />
                ))}
              </View>

              <View style={styles.paletteInfo}>
                <Text style={styles.paletteName}>{palette.name}</Text>
                <AnimatedPressable
                  onPress={() => handleApplyPalette(palette)}
                  style={styles.applyBtn}
                >
                  <Text style={styles.applyBtnText}>Apply to project</Text>
                </AnimatedPressable>
              </View>

              {/* Hex codes */}
              <View style={styles.hexSection}>
                {palette.colors.map((color, i) => {
                  const isCopied = copiedHex === color;
                  return (
                    <View key={i} style={styles.hexRow}>
                      <View style={[styles.hexSwatch, { backgroundColor: color }]} />
                      <Text style={styles.hexCode}>{color}</Text>
                      <AnimatedPressable
                        onPress={() => handleCopyHex(color)}
                        style={styles.copyBtn}
                      >
                        {isCopied ? (
                          <Check size={14} color={COLORS.success} />
                        ) : (
                          <Copy size={14} color={COLORS.textSecondary} />
                        )}
                      </AnimatedPressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Apply Sheet */}
      <BottomSheet
        visible={showApplySheet}
        onClose={() => setShowApplySheet(false)}
        maxHeight={500}
      >
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>Apply Palette</Text>
          <Text style={styles.sheetSubtitle}>
            {selectedPalette?.name}
          </Text>

          {project && project.rooms.length > 0 ? (
            <>
              <Text style={styles.sheetLabel}>Select rooms</Text>
              {project.rooms.map(room => {
                const isSelected = selectedRooms.has(room.id);
                return (
                  <AnimatedPressable
                    key={room.id}
                    onPress={() => handleToggleRoom(room.id)}
                    style={[styles.roomRow, isSelected && styles.roomRowActive]}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Check size={12} color="#fff" />}
                    </View>
                    <Text style={styles.roomRowText}>{room.name}</Text>
                  </AnimatedPressable>
                );
              })}

              <Text style={styles.sheetLabel}>Apply colors</Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[PaletteExtractor] Toggle apply wall:', !applyWall);
                  setApplyWall(v => !v);
                }}
                style={[styles.toggleRow, applyWall && styles.toggleRowActive]}
              >
                <View style={[styles.checkbox, applyWall && styles.checkboxActive]}>
                  {applyWall && <Check size={12} color="#fff" />}
                </View>
                <Text style={styles.toggleRowText}>Apply Wall Color (first swatch)</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  console.log('[PaletteExtractor] Toggle apply floor:', !applyFloor);
                  setApplyFloor(v => !v);
                }}
                style={[styles.toggleRow, applyFloor && styles.toggleRowActive]}
              >
                <View style={[styles.checkbox, applyFloor && styles.checkboxActive]}>
                  {applyFloor && <Check size={12} color="#fff" />}
                </View>
                <Text style={styles.toggleRowText}>Apply Floor Color (last swatch)</Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={handleConfirmApply}
                style={[styles.confirmBtn, selectedRooms.size === 0 && styles.confirmBtnDisabled]}
                disabled={selectedRooms.size === 0}
              >
                <Text style={styles.confirmBtnText}>
                  Apply to {selectedRooms.size} room{selectedRooms.size !== 1 ? 's' : ''}
                </Text>
              </AnimatedPressable>
            </>
          ) : (
            <Text style={styles.noRoomsText}>No rooms in this project yet.</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  styleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  styleChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  styleChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  styleChipTextActive: {
    color: COLORS.primary,
  },
  palettesSection: {
    gap: 16,
  },
  paletteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  swatchRow: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    height: 48,
  },
  swatch: {
    flex: 1,
  },
  paletteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paletteName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  applyBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  hexSection: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 12,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hexSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hexCode: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'SpaceMono',
    flex: 1,
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sheet
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: -4,
  },
  sheetLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomRowActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  roomRowText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleRowActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  toggleRowText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  noRoomsText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
