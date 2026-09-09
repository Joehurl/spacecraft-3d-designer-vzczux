import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, DollarSign } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Room } from '@/types';

const ROOM_TYPE_EMOJI: Record<string, string> = {
  living: '🛋️',
  bedroom: '🛏️',
  kitchen: '🍳',
  bathroom: '🛁',
  office: '🖥️',
  dining: '🍽️',
  other: '🏠',
};

function getRoomCost(room: Room): number {
  return room.placedItems.reduce((sum, item) => {
    const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
    return sum + (furniture?.price ?? 0);
  }, 0);
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceTertiary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default function BudgetTrackerScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects, setBudget, setRoomBudget } = useFloorPlan();

  const project = projects.find(p => p.id === projectId);

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(project?.budget ?? ''));

  const totalSpent = useMemo(() => {
    if (!project) return 0;
    return project.rooms.reduce((sum, room) => sum + getRoomCost(room), 0);
  }, [project]);

  const totalBudget = project?.budget ?? 0;
  const remaining = totalBudget - totalSpent;
  const spentPct = totalBudget > 0 ? totalSpent / totalBudget : 0;

  const budgetColor = spentPct > 1
    ? COLORS.danger
    : spentPct > 0.8
    ? COLORS.warning
    : COLORS.success;

  const handleSaveBudget = useCallback(() => {
    if (!project) return;
    const val = parseFloat(budgetInput.replace(/[^0-9.]/g, ''));
    const budget = isNaN(val) ? 0 : val;
    console.log('[BudgetTracker] Save total budget:', budget, 'for project:', project.id);
    setBudget(project.id, budget);
    setEditingBudget(false);
  }, [project, budgetInput, setBudget]);

  const handleRoomBudgetChange = useCallback((roomId: string, value: string) => {
    if (!project) return;
    const val = parseFloat(value.replace(/[^0-9.]/g, ''));
    const budget = isNaN(val) ? 0 : val;
    console.log('[BudgetTracker] Set room budget:', roomId, budget);
    setRoomBudget(project.id, roomId, budget);
  }, [project, setRoomBudget]);

  if (!project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  const totalFurnitureValue = totalSpent;
  const totalRooms = project.rooms.length;

  const renderRoom = ({ item: room }: { item: Room }) => {
    const roomCost = getRoomCost(room);
    const roomBudget = room.roomBudget ?? 0;
    const roomPct = roomBudget > 0 ? roomCost / roomBudget : 0;
    const roomColor = roomPct > 1 ? COLORS.danger : roomPct > 0.8 ? COLORS.warning : COLORS.success;
    const itemCount = room.placedItems.length;
    const typeEmoji = ROOM_TYPE_EMOJI[room.type] ?? '🏠';

    return (
      <View style={styles.roomCard}>
        <View style={styles.roomHeader}>
          <View style={styles.roomTitleRow}>
            <Text style={styles.roomEmoji}>{typeEmoji}</Text>
            <View style={styles.roomTitleInfo}>
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={styles.roomMeta}>
                {itemCount}
                <Text style={styles.roomMetaSep}> items · </Text>
                ${roomCost.toLocaleString()}
                <Text style={styles.roomMetaSep}> spent</Text>
              </Text>
            </View>
          </View>
          <View style={styles.roomBudgetInputWrap}>
            <Text style={styles.roomBudgetLabel}>Budget</Text>
            <TextInput
              style={styles.roomBudgetInput}
              value={room.roomBudget !== undefined ? String(room.roomBudget) : ''}
              onChangeText={v => handleRoomBudgetChange(room.id, v)}
              placeholder="0"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
              onFocus={() => console.log('[BudgetTracker] Room budget input focused:', room.id)}
            />
          </View>
        </View>
        {roomBudget > 0 && (
          <View style={styles.roomProgressWrap}>
            <ProgressBar value={roomCost} max={roomBudget} color={roomColor} />
            <View style={styles.roomProgressLabels}>
              <Text style={[styles.roomProgressText, { color: roomColor }]}>
                ${roomCost.toLocaleString()} spent
              </Text>
              <Text style={styles.roomProgressText}>
                ${roomBudget.toLocaleString()} budget
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <DollarSign size={20} color={COLORS.accent} />
            <Text style={styles.headerTitle}>Budget Tracker</Text>
          </View>
          <AnimatedPressable
            onPress={() => {
              console.log('[BudgetTracker] Close pressed');
              router.back();
            }}
            style={styles.closeBtn}
          >
            <X size={20} color={COLORS.text} />
          </AnimatedPressable>
        </View>

        <FlatList
          data={project.rooms}
          keyExtractor={r => r.id}
          renderItem={renderRoom}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Total Budget Card */}
              <View style={styles.totalCard}>
                <Text style={styles.totalCardTitle}>Total Budget</Text>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[BudgetTracker] Edit total budget pressed');
                    setBudgetInput(String(project.budget ?? ''));
                    setEditingBudget(true);
                  }}
                  style={styles.budgetInputRow}
                >
                  <Text style={styles.dollarSign}>$</Text>
                  {editingBudget ? (
                    <TextInput
                      style={styles.budgetInput}
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      keyboardType="numeric"
                      autoFocus
                      onBlur={handleSaveBudget}
                      onSubmitEditing={handleSaveBudget}
                      placeholder="0"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  ) : (
                    <Text style={styles.budgetValue}>
                      {totalBudget > 0 ? totalBudget.toLocaleString() : '0'}
                    </Text>
                  )}
                  {!editingBudget && (
                    <Text style={styles.budgetEditHint}>tap to edit</Text>
                  )}
                </AnimatedPressable>

                {totalBudget > 0 && (
                  <View style={styles.progressSection}>
                    <ProgressBar value={totalSpent} max={totalBudget} color={budgetColor} />
                    <View style={styles.progressLabels}>
                      <View style={styles.progressLabelItem}>
                        <Text style={styles.progressLabelTitle}>Spent</Text>
                        <Text style={[styles.progressLabelValue, { color: budgetColor }]}>
                          ${totalSpent.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.progressLabelItem}>
                        <Text style={styles.progressLabelTitle}>Remaining</Text>
                        <Text style={[styles.progressLabelValue, { color: remaining >= 0 ? COLORS.success : COLORS.danger }]}>
                          {remaining >= 0 ? '+' : ''}${Math.abs(remaining).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {totalBudget === 0 && (
                  <Text style={styles.noBudgetHint}>Tap the amount above to set your total budget</Text>
                )}
              </View>

              <Text style={styles.sectionTitle}>Per Room</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Total furniture value: ${totalFurnitureValue.toLocaleString()} across {totalRooms} room{totalRooms !== 1 ? 's' : ''}
              </Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  listHeader: {
    gap: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  totalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  totalCardTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dollarSign: {
    color: COLORS.accent,
    fontSize: 32,
    fontWeight: '800',
  },
  budgetInput: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    minWidth: 120,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 0,
  },
  budgetValue: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  budgetEditHint: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginLeft: 8,
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  progressSection: {
    gap: 10,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelItem: {
    gap: 2,
  },
  progressLabelTitle: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressLabelValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  noBudgetHint: {
    color: COLORS.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  roomCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  roomEmoji: {
    fontSize: 28,
  },
  roomTitleInfo: {
    gap: 2,
    flex: 1,
  },
  roomName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  roomMeta: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  roomMetaSep: {
    color: COLORS.textTertiary,
  },
  roomBudgetInputWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  roomBudgetLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roomBudgetInput: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
  },
  roomProgressWrap: {
    gap: 6,
  },
  roomProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roomProgressText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
