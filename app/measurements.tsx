import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  Share,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Download, ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FURNITURE_CATALOG, CATEGORY_COLORS } from '@/data/furniture';
import { Room } from '@/types';
import {
  calculateRoomAreaM2,
  calculateRoomAreaSqFt,
  calculatePerimeter,
  calculateWallArea,
  calculateNetWallArea,
  calculateFurnitureCoverageWithCatalog,
  cmToFtIn,
  formatLength,
  getWallLabel,
  getWallLength,
} from '@/utils/measurementUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type UnitPref = 'cm' | 'ft';
type FlooringMaterial = 'Hardwood' | 'Laminate' | 'Tile' | 'Carpet' | 'Vinyl' | 'Concrete';

interface MeasurementPrefs {
  unit: UnitPref;
  ceilingHeights: Record<string, number>;
  flooringMaterial: FlooringMaterial;
  flooringPrices: Record<FlooringMaterial, number>;
  paintPricePerLiter: number;
  paintCoats: 1 | 2;
  addWaste: boolean;
  selectedWallColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = '@spacecraft3d_measurements_';

const FLOORING_DEFAULTS: Record<FlooringMaterial, number> = {
  Hardwood: 85,
  Laminate: 35,
  Tile: 45,
  Carpet: 25,
  Vinyl: 30,
  Concrete: 55,
};

const FLOORING_MATERIALS: FlooringMaterial[] = ['Hardwood', 'Laminate', 'Tile', 'Carpet', 'Vinyl', 'Concrete'];

const FLOORING_EMOJIS: Record<FlooringMaterial, string> = {
  Hardwood: '🪵',
  Laminate: '🟫',
  Tile: '⬜',
  Carpet: '🟥',
  Vinyl: '🔷',
  Concrete: '⬛',
};

const WALL_COLORS_PRESET = ['#F5F5F0', '#E8E4DC', '#D4C5B0', '#C8D8E8', '#D8E8D0', '#F0E8D8'];

const DEFAULT_CEILING_HEIGHT = 250; // cm
const PAINT_COVERAGE_PER_LITER = 10; // m² per liter

// ─── Mock furniture prices ────────────────────────────────────────────────────

const FURNITURE_PRICES: Record<string, number> = {
  'sofa-001': 1200, 'sofa-002': 650, 'sofa-003': 900, 'sofa-004': 1100,
  'sofa-005': 1800, 'sofa-006': 950, 'chair-001': 350, 'chair-002': 420,
  'chair-003': 580, 'chair-004': 280, 'chair-005': 220, 'chair-006': 390,
  'coffee-001': 280, 'coffee-002': 320, 'dining-001': 750, 'dining-002': 520,
  'bed-001': 1400, 'bed-002': 1100, 'bed-003': 650, 'bed-006': 900,
  'wardrobe-001': 680, 'wardrobe-002': 1200, 'bookshelf-001': 320,
  'tv-unit-001': 480, 'tv-unit-002': 420, 'desk-001': 380, 'desk-002': 620,
  'lamp-001': 180, 'lamp-003': 95, 'pendant-001': 140, 'chandelier-001': 480,
  'rug-001': 320, 'plant-001': 85, 'plant-002': 65, 'mirror-001': 220,
  'kitchen-001': 1800, 'kitchen-002': 1200, 'kitchen-003': 950,
  'bath-001': 1400, 'shower-001': 1100, 'vanity-001': 850,
};

function getFurniturePrice(furnitureId: string): number {
  return FURNITURE_PRICES[furnitureId] ?? 150;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeasurementsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects } = useFloorPlan();

  const project = projects.find(p => p.id === projectId);
  const rooms = project?.rooms ?? [];

  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [prefs, setPrefs] = useState<MeasurementPrefs>({
    unit: 'cm',
    ceilingHeights: {},
    flooringMaterial: 'Hardwood',
    flooringPrices: { ...FLOORING_DEFAULTS },
    paintPricePerLiter: 15,
    paintCoats: 1,
    addWaste: false,
    selectedWallColor: WALL_COLORS_PRESET[0],
  });
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load persisted prefs
  useEffect(() => {
    if (!projectId) return;
    const key = `${STORAGE_KEY_PREFIX}${projectId}`;
    console.log('[Measurements] Loading prefs for project:', projectId);
    AsyncStorage.getItem(key)
      .then(json => {
        if (json) {
          const saved = JSON.parse(json) as Partial<MeasurementPrefs>;
          setPrefs(prev => ({
            ...prev,
            ...saved,
            flooringPrices: { ...FLOORING_DEFAULTS, ...(saved.flooringPrices ?? {}) },
          }));
        }
      })
      .catch(() => {})
      .finally(() => setPrefsLoaded(true));
  }, [projectId]);

  // Persist prefs on change
  useEffect(() => {
    if (!projectId || !prefsLoaded) return;
    const key = `${STORAGE_KEY_PREFIX}${projectId}`;
    AsyncStorage.setItem(key, JSON.stringify(prefs)).catch(() => {});
  }, [prefs, projectId, prefsLoaded]);

  const room: Room | undefined = rooms[selectedRoomIndex];

  const ceilingHeight = room
    ? (prefs.ceilingHeights[room.id] ?? DEFAULT_CEILING_HEIGHT)
    : DEFAULT_CEILING_HEIGHT;

  // ─── Computed measurements ─────────────────────────────────────────────────

  const areaM2 = room ? calculateRoomAreaM2(room) : 0;
  const areaSqFt = room ? calculateRoomAreaSqFt(room) : 0;
  const perimeterCm = room ? calculatePerimeter(room) : 0;
  const perimeterM = perimeterCm / 100;
  const perimeterFt = perimeterCm / 30.48;
  const wallAreaCm2 = room ? calculateWallArea(room, ceilingHeight) : 0;
  const wallAreaM2 = wallAreaCm2 / 10000;
  const netWallAreaCm2 = room ? calculateNetWallArea(room, ceilingHeight) : 0;
  const netWallAreaM2 = netWallAreaCm2 / 10000;
  const furnitureCoverage = room
    ? calculateFurnitureCoverageWithCatalog(room, FURNITURE_CATALOG)
    : 0;

  const totalDoorsWidth = room
    ? room.doors.reduce((s, d) => s + d.width, 0)
    : 0;
  const totalWindowsWidth = room
    ? room.windows.reduce((s, w) => s + w.width, 0)
    : 0;

  const roomWidth = room ? room.width : 0;
  const roomHeight = room ? room.height : 0;

  // ─── Cost calculations ─────────────────────────────────────────────────────

  const flooringAreaM2 = prefs.addWaste ? areaM2 * 1.1 : areaM2;
  const flooringPricePerM2 = prefs.flooringPrices[prefs.flooringMaterial];
  const flooringTotal = flooringAreaM2 * flooringPricePerM2;

  const paintAreaM2 = netWallAreaM2 * prefs.paintCoats;
  const litersNeeded = Math.ceil(paintAreaM2 / PAINT_COVERAGE_PER_LITER);
  const paintTotal = litersNeeded * prefs.paintPricePerLiter;

  // Furniture budget
  const furnitureByCategoryMap = useMemo(() => {
    if (!room) return new Map<string, { items: string[]; total: number }>();
    const map = new Map<string, { items: string[]; total: number }>();
    room.placedItems.forEach(item => {
      const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
      if (!furniture) return;
      const price = getFurniturePrice(item.furnitureId);
      const existing = map.get(furniture.category) ?? { items: [], total: 0 };
      map.set(furniture.category, {
        items: [...existing.items, furniture.name],
        total: existing.total + price,
      });
    });
    return map;
  }, [room]);

  const furnitureTotal = useMemo(() => {
    let total = 0;
    furnitureByCategoryMap.forEach(v => { total += v.total; });
    return total;
  }, [furnitureByCategoryMap]);

  const grandTotal = flooringTotal + paintTotal + furnitureTotal;

  // ─── Tips ──────────────────────────────────────────────────────────────────

  const tips = useMemo(() => {
    const result: string[] = [];
    if (furnitureCoverage > 50) {
      result.push('Consider removing some furniture for better flow and movement through the space.');
    }
    if (areaM2 < 15) {
      result.push('Use light colors and mirrors to make the space feel larger and more open.');
    }
    if (room && room.windows.length === 0) {
      result.push('Add lighting layers to compensate for lack of natural light — combine ambient, task, and accent lighting.');
    }
    if (result.length === 0) {
      result.push('Great layout! Your room has good proportions and furniture coverage.');
    }
    return result.slice(0, 3);
  }, [furnitureCoverage, areaM2, room]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const updatePref = useCallback(<K extends keyof MeasurementPrefs>(key: K, value: MeasurementPrefs[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateCeilingHeight = useCallback((roomId: string, value: number) => {
    setPrefs(prev => ({
      ...prev,
      ceilingHeights: { ...prev.ceilingHeights, [roomId]: value },
    }));
  }, []);

  const updateFlooringPrice = useCallback((material: FlooringMaterial, price: number) => {
    setPrefs(prev => ({
      ...prev,
      flooringPrices: { ...prev.flooringPrices, [material]: price },
    }));
  }, []);

  const handleExport = useCallback(async () => {
    if (!project || !room) return;
    console.log('[Measurements] Export pressed for project:', project.id);
    const lines = [
      `📐 Measurements — ${project.name}`,
      `Room: ${room.name}`,
      ``,
      `DIMENSIONS`,
      `Width: ${formatLength(roomWidth, prefs.unit)}  Depth: ${formatLength(roomHeight, prefs.unit)}`,
      `Floor Area: ${areaM2.toFixed(1)} m² (${areaSqFt.toFixed(1)} sq ft)`,
      `Perimeter: ${perimeterM.toFixed(1)} m (${perimeterFt.toFixed(1)} ft)`,
      `Ceiling Height: ${ceilingHeight} cm`,
      ``,
      `WALLS`,
      `Total Wall Area: ${wallAreaM2.toFixed(1)} m²`,
      `Net Wall Area: ${netWallAreaM2.toFixed(1)} m²`,
      `Doors Total Width: ${totalDoorsWidth} cm`,
      `Windows Total Width: ${totalWindowsWidth} cm`,
      ``,
      `FURNITURE`,
      `Coverage: ${furnitureCoverage.toFixed(1)}%`,
      ``,
      `COST ESTIMATE`,
      `Flooring (${prefs.flooringMaterial}): $${flooringTotal.toFixed(2)}`,
      `Paint: $${paintTotal.toFixed(2)} (${litersNeeded}L needed)`,
      `Furniture: $${furnitureTotal.toFixed(2)}`,
      `GRAND TOTAL: $${grandTotal.toFixed(2)}`,
    ];
    try {
      await Share.share({ message: lines.join('\n') });
      console.log('[Measurements] Export shared successfully');
    } catch (e) {
      console.log('[Measurements] Export share error:', e);
    }
  }, [project, room, prefs, areaM2, areaSqFt, perimeterM, perimeterFt, ceilingHeight, wallAreaM2, netWallAreaM2, totalDoorsWidth, totalWindowsWidth, furnitureCoverage, flooringTotal, paintTotal, litersNeeded, furnitureTotal, grandTotal, roomWidth, roomHeight]);

  const handleSaveEstimate = useCallback(() => {
    console.log('[Measurements] Save estimate pressed, total:', grandTotal);
    Alert.alert('Estimate saved!', `Grand total: $${grandTotal.toFixed(2)}`);
  }, [grandTotal]);

  const handleShareEstimate = useCallback(async () => {
    console.log('[Measurements] Share estimate pressed');
    const msg = [
      `🏠 Cost Estimate — ${project?.name ?? 'Project'}`,
      `Flooring: $${flooringTotal.toFixed(2)}`,
      `Paint: $${paintTotal.toFixed(2)}`,
      `Furniture: $${furnitureTotal.toFixed(2)}`,
      `Total: $${grandTotal.toFixed(2)}`,
    ].join('\n');
    try {
      await Share.share({ message: msg });
    } catch (e) {
      console.log('[Measurements] Share estimate error:', e);
    }
  }, [project, flooringTotal, paintTotal, furnitureTotal, grandTotal]);

  // ─── Coverage bar color ────────────────────────────────────────────────────

  const coverageColor = furnitureCoverage < 40
    ? COLORS.success
    : furnitureCoverage < 60
    ? COLORS.warning
    : COLORS.danger;

  const coverageBarWidth = `${Math.min(100, furnitureCoverage)}%` as `${number}%`;

  // ─── Formatted values (no logic in JSX) ───────────────────────────────────

  const widthCm = Math.round(roomWidth);
  const heightCm = Math.round(roomHeight);
  const widthFt = cmToFtIn(roomWidth);
  const heightFt = cmToFtIn(roomHeight);
  const areaM2Display = areaM2.toFixed(1);
  const areaSqFtDisplay = areaSqFt.toFixed(1);
  const perimeterMDisplay = perimeterM.toFixed(1);
  const perimeterFtDisplay = perimeterFt.toFixed(1);
  const wallAreaM2Display = wallAreaM2.toFixed(1);
  const netWallAreaM2Display = netWallAreaM2.toFixed(1);
  const coverageDisplay = furnitureCoverage.toFixed(1);
  const flooringAreaDisplay = flooringAreaM2.toFixed(1);
  const flooringTotalDisplay = flooringTotal.toFixed(2);
  const litersDisplay = String(litersNeeded);
  const paintTotalDisplay = paintTotal.toFixed(2);
  const furnitureTotalDisplay = furnitureTotal.toFixed(2);
  const grandTotalDisplay = grandTotal.toFixed(2);
  const ceilingHeightDisplay = String(ceilingHeight);
  const totalDoorsDisplay = `${totalDoorsWidth} cm`;
  const totalWindowsDisplay = `${totalWindowsWidth} cm`;

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
        <Text style={styles.headerTitle}>📐 Measurements</Text>
        <View style={styles.headerActions}>
          <AnimatedPressable
            onPress={handleExport}
            style={styles.headerBtn}
          >
            <Download size={18} color={COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[Measurements] Close pressed');
              router.back();
            }}
            style={styles.headerBtn}
          >
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Room Selector */}
        {rooms.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomChipsRow}
            style={styles.roomChipsScroll}
          >
            {rooms.map((r, i) => {
              const isActive = i === selectedRoomIndex;
              return (
                <AnimatedPressable
                  key={r.id}
                  onPress={() => {
                    console.log('[Measurements] Select room:', r.name);
                    setSelectedRoomIndex(i);
                  }}
                  style={[styles.roomChip, isActive && styles.roomChipActive]}
                >
                  <Text style={[styles.roomChipText, isActive && styles.roomChipTextActive]}>
                    {r.name}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        )}

        {room ? (
          <>
            {/* ── Unit Toggle ── */}
            <View style={styles.unitToggleRow}>
              <Text style={styles.unitLabel}>Units</Text>
              <View style={styles.segmented}>
                {(['cm', 'ft'] as UnitPref[]).map(u => {
                  const isActive = prefs.unit === u;
                  return (
                    <AnimatedPressable
                      key={u}
                      onPress={() => {
                        console.log('[Measurements] Unit toggle:', u);
                        updatePref('unit', u);
                      }}
                      style={[styles.segBtn, isActive && styles.segBtnActive]}
                    >
                      <Text style={[styles.segBtnText, isActive && styles.segBtnTextActive]}>
                        {u}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {/* ── Floor Plan Dimensions ── */}
            <SectionCard title="Floor Plan Dimensions" emoji="📏">
              <MeasRow
                label="Width"
                value={prefs.unit === 'cm' ? `${widthCm} cm` : widthFt}
              />
              <Divider />
              <MeasRow
                label="Depth"
                value={prefs.unit === 'cm' ? `${heightCm} cm` : heightFt}
              />
              <Divider />
              <MeasRow
                label="Floor Area"
                value={`${areaM2Display} m²`}
                sub={`${areaSqFtDisplay} sq ft`}
              />
              <Divider />
              <MeasRow
                label="Perimeter"
                value={`${perimeterMDisplay} m`}
                sub={`${perimeterFtDisplay} ft`}
              />
              <Divider />
              <View style={styles.settingRow}>
                <Text style={styles.measLabel}>Ceiling Height</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.numInput}
                    value={ceilingHeightDisplay}
                    onChangeText={t => {
                      const n = parseInt(t, 10);
                      if (!isNaN(n) && n > 0) {
                        console.log('[Measurements] Ceiling height changed:', n);
                        updateCeilingHeight(room.id, n);
                      }
                    }}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              </View>
            </SectionCard>

            {/* ── Wall Measurements ── */}
            <SectionCard title="Wall Measurements" emoji="🧱">
              {room.walls.map((wall, i) => {
                const len = getWallLength(wall);
                const label = getWallLabel(i);
                const lenDisplay = formatLength(len, prefs.unit);
                return (
                  <React.Fragment key={wall.id}>
                    {i > 0 && <Divider />}
                    <MeasRow label={label} value={lenDisplay} />
                  </React.Fragment>
                );
              })}
              <Divider />
              <MeasRow
                label="Total Wall Area"
                value={`${wallAreaM2Display} m²`}
                highlight
              />
              <Divider />
              <MeasRow label="Door Openings" value={totalDoorsDisplay} />
              <Divider />
              <MeasRow label="Window Openings" value={totalWindowsDisplay} />
              <Divider />
              <MeasRow
                label="Net Wall Area"
                value={`${netWallAreaM2Display} m²`}
                sub="(for paint/wallpaper)"
                highlight
              />
            </SectionCard>

            {/* ── Furniture Coverage ── */}
            <SectionCard title="Furniture Coverage" emoji="🛋️">
              <MeasRow
                label="Furniture Footprint"
                value={`${coverageDisplay}%`}
              />
              <Divider />
              <View style={styles.coverageBarWrap}>
                <View style={styles.coverageBarBg}>
                  <View
                    style={[
                      styles.coverageBarFill,
                      { width: coverageBarWidth, backgroundColor: coverageColor },
                    ]}
                  />
                </View>
                <View style={styles.coverageLabels}>
                  <Text style={styles.coverageLabelText}>0%</Text>
                  <Text style={[styles.coverageLabelText, { color: COLORS.success }]}>40%</Text>
                  <Text style={[styles.coverageLabelText, { color: COLORS.warning }]}>60%</Text>
                  <Text style={styles.coverageLabelText}>100%</Text>
                </View>
              </View>
              <View style={styles.coverageTip}>
                <Text style={styles.coverageTipText}>
                  Ideal coverage is 30–40% of floor area
                </Text>
              </View>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════════════════ */}
            <Text style={styles.sectionHeader}>💰 Cost Estimator</Text>

            {/* ── Flooring Costs ── */}
            <SectionCard title="Flooring" emoji="🪵">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.materialChipsRow}
              >
                {FLOORING_MATERIALS.map(mat => {
                  const isActive = prefs.flooringMaterial === mat;
                  return (
                    <AnimatedPressable
                      key={mat}
                      onPress={() => {
                        console.log('[Measurements] Flooring material selected:', mat);
                        updatePref('flooringMaterial', mat);
                      }}
                      style={[styles.materialChip, isActive && styles.materialChipActive]}
                    >
                      <Text style={styles.materialEmoji}>{FLOORING_EMOJIS[mat]}</Text>
                      <Text style={[styles.materialChipText, isActive && styles.materialChipTextActive]}>
                        {mat}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>

              <Divider />

              <View style={styles.settingRow}>
                <Text style={styles.measLabel}>Price per m²</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputUnit}>$</Text>
                  <TextInput
                    style={styles.numInput}
                    value={String(prefs.flooringPrices[prefs.flooringMaterial])}
                    onChangeText={t => {
                      const n = parseFloat(t);
                      if (!isNaN(n) && n >= 0) {
                        console.log('[Measurements] Flooring price changed:', prefs.flooringMaterial, n);
                        updateFlooringPrice(prefs.flooringMaterial, n);
                      }
                    }}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>

              <Divider />

              <View style={styles.settingRow}>
                <Text style={styles.measLabel}>Add 10% waste</Text>
                <Switch
                  value={prefs.addWaste}
                  onValueChange={v => {
                    console.log('[Measurements] Add waste toggle:', v);
                    updatePref('addWaste', v);
                  }}
                  trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>

              <Divider />

              <MeasRow
                label="Area to cover"
                value={`${flooringAreaDisplay} m²`}
                sub={prefs.addWaste ? '+10% waste included' : undefined}
              />
              <Divider />
              <MeasRow
                label="Flooring Total"
                value={`$${flooringTotalDisplay}`}
                highlight
              />
            </SectionCard>

            {/* ── Paint Costs ── */}
            <SectionCard title="Paint" emoji="🎨">
              <View style={styles.settingRow}>
                <Text style={styles.measLabel}>Coats</Text>
                <View style={styles.segmented}>
                  {([1, 2] as (1 | 2)[]).map(c => {
                    const isActive = prefs.paintCoats === c;
                    return (
                      <AnimatedPressable
                        key={c}
                        onPress={() => {
                          console.log('[Measurements] Paint coats:', c);
                          updatePref('paintCoats', c);
                        }}
                        style={[styles.segBtn, isActive && styles.segBtnActive]}
                      >
                        <Text style={[styles.segBtnText, isActive && styles.segBtnTextActive]}>
                          {c}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <Divider />

              <View style={styles.settingRow}>
                <Text style={styles.measLabel}>Price per liter</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputUnit}>$</Text>
                  <TextInput
                    style={styles.numInput}
                    value={String(prefs.paintPricePerLiter)}
                    onChangeText={t => {
                      const n = parseFloat(t);
                      if (!isNaN(n) && n >= 0) {
                        console.log('[Measurements] Paint price changed:', n);
                        updatePref('paintPricePerLiter', n);
                      }
                    }}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>

              <Divider />

              {/* Wall color swatches */}
              <View style={styles.colorSwatchRow}>
                {WALL_COLORS_PRESET.map(color => {
                  const isSelected = prefs.selectedWallColor === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => {
                        console.log('[Measurements] Wall color selected:', color);
                        updatePref('selectedWallColor', color);
                      }}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                    />
                  );
                })}
              </View>

              <Divider />

              <MeasRow
                label="Liters needed"
                value={`${litersDisplay} L`}
                sub={`1L covers ${PAINT_COVERAGE_PER_LITER}m²`}
              />
              <Divider />
              <MeasRow
                label="Paint Total"
                value={`$${paintTotalDisplay}`}
                highlight
              />
            </SectionCard>

            {/* ── Furniture Budget ── */}
            <SectionCard title="Furniture Budget" emoji="🛒">
              {furnitureByCategoryMap.size === 0 ? (
                <Text style={styles.emptyText}>No furniture placed in this room yet.</Text>
              ) : (
                Array.from(furnitureByCategoryMap.entries()).map(([category, data], i) => {
                  const catColor = CATEGORY_COLORS[category] ?? COLORS.primary;
                  const subtotalDisplay = data.total.toFixed(2);
                  return (
                    <React.Fragment key={category}>
                      {i > 0 && <Divider />}
                      <View style={styles.categoryRow}>
                        <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </Text>
                          <Text style={styles.categoryCount}>
                            {data.items.length} item{data.items.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Text style={styles.categoryTotal}>${subtotalDisplay}</Text>
                      </View>
                    </React.Fragment>
                  );
                })
              )}
              {furnitureByCategoryMap.size > 0 && (
                <>
                  <Divider />
                  <MeasRow
                    label="Furniture Total"
                    value={`$${furnitureTotalDisplay}`}
                    highlight
                  />
                </>
              )}
              <Divider />
              <AnimatedPressable
                onPress={() => {
                  console.log('[Measurements] View Shopping List pressed, projectId:', projectId);
                  router.push(`/shopping-list?projectId=${projectId}`);
                }}
                style={styles.shoppingListBtn}
              >
                <Text style={styles.shoppingListBtnText}>View Shopping List</Text>
                <ChevronRight size={16} color={COLORS.primary} />
              </AnimatedPressable>
            </SectionCard>

            {/* ── Grand Total ── */}
            <LinearGradient
              colors={['#1A2A4A', '#0F1E38']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.grandTotalCard}
            >
              <Text style={styles.grandTotalLabel}>Total Project Cost</Text>
              <Text style={styles.grandTotalValue}>${grandTotalDisplay}</Text>
              <View style={styles.grandTotalBreakdown}>
                <Text style={styles.grandTotalBreakdownText}>
                  Flooring ${flooringTotalDisplay}  +  Paint ${paintTotalDisplay}  +  Furniture ${furnitureTotalDisplay}
                </Text>
              </View>
              <View style={styles.grandTotalActions}>
                <AnimatedPressable
                  onPress={handleSaveEstimate}
                  style={styles.grandTotalBtn}
                >
                  <Text style={styles.grandTotalBtnText}>Save Estimate</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={handleShareEstimate}
                  style={[styles.grandTotalBtn, styles.grandTotalBtnOutline]}
                >
                  <Text style={[styles.grandTotalBtnText, { color: COLORS.primary }]}>
                    Share
                  </Text>
                </AnimatedPressable>
              </View>
            </LinearGradient>

            {/* ── Tips ── */}
            <SectionCard title="Design Tips" emoji="💡">
              {tips.map((tip, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Divider />}
                  <View style={styles.tipRow}>
                    <Text style={styles.tipBullet}>•</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                </React.Fragment>
              ))}
            </SectionCard>
          </>
        ) : (
          <View style={styles.noRoomState}>
            <Text style={styles.noRoomText}>No rooms in this project yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function MeasRow({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.measRow}>
      <Text style={styles.measLabel}>{label}</Text>
      <View style={styles.measValueWrap}>
        <Text style={[styles.measValue, highlight && styles.measValueHighlight]}>{value}</Text>
        {sub ? <Text style={styles.measSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  roomChipsScroll: {
    marginHorizontal: -16,
  },
  roomChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  roomChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  roomChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  roomChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  roomChipTextActive: {
    color: COLORS.primary,
  },
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  unitLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surfaceSecondary,
  },
  cardEmoji: {
    fontSize: 16,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  cardBody: {
    paddingVertical: 4,
  },
  measRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  measLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  measValueWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  measValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  measValueHighlight: {
    color: COLORS.primary,
    fontSize: 16,
  },
  measSub: {
    color: COLORS.textTertiary,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  numInput: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'right',
  },
  inputUnit: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  segBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  segBtnTextActive: {
    color: '#fff',
  },
  coverageBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  coverageBarBg: {
    height: 12,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 6,
    overflow: 'hidden',
  },
  coverageBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  coverageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverageLabelText: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '600',
  },
  coverageTip: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coverageTipText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '500',
  },
  materialChipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  materialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  materialChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  materialEmoji: {
    fontSize: 14,
  },
  materialChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  materialChipTextActive: {
    color: COLORS.primary,
  },
  colorSwatchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  colorSwatchSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2.5,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryInfo: {
    flex: 1,
    gap: 2,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryCount: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  categoryTotal: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  shoppingListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  shoppingListBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  grandTotalCard: {
    borderRadius: 20,
    padding: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.3)',
  },
  grandTotalLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  grandTotalBreakdown: {
    marginTop: 4,
  },
  grandTotalBreakdownText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  grandTotalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  grandTotalBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  grandTotalBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  grandTotalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  tipBullet: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  tipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  noRoomState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noRoomText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
