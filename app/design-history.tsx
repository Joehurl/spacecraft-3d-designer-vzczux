import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Clock, RotateCcw, Info } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { VersionCard } from '@/components/VersionCard';
import { useHistory, ProjectSnapshot } from '@/contexts/HistoryContext';
import { useFloorPlan } from '@/contexts/FloorPlanContext';

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return diffMins + ' minute' + (diffMins !== 1 ? 's' : '') + ' ago';
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours + ' hour' + (diffHours !== 1 ? 's' : '') + ' ago';
  const diffDays = Math.floor(diffHours / 24);
  return diffDays + ' day' + (diffDays !== 1 ? 's' : '') + ' ago';
}

function DiffSummary({ current, selected }: { current: ProjectSnapshot; selected: ProjectSnapshot }) {
  const addedItems = current.itemCount - selected.itemCount;
  const changedWalls = Math.abs(current.wallCount - selected.wallCount);

  const addedText = addedItems > 0
    ? '+ ' + addedItems + ' item' + (addedItems !== 1 ? 's' : '') + ' added'
    : addedItems < 0
    ? '- ' + Math.abs(addedItems) + ' item' + (Math.abs(addedItems) !== 1 ? 's' : '') + ' removed'
    : 'No item changes';

  const wallText = changedWalls > 0
    ? changedWalls + ' wall' + (changedWalls !== 1 ? 's' : '') + ' changed'
    : 'No wall changes';

  return (
    <View style={diffStyles.container}>
      <Text style={diffStyles.title}>Changes since this version</Text>
      <View style={diffStyles.row}>
        <View style={[diffStyles.badge, addedItems > 0 ? diffStyles.badgeAdd : addedItems < 0 ? diffStyles.badgeRemove : diffStyles.badgeNeutral]}>
          <Text style={[diffStyles.badgeText, addedItems > 0 ? diffStyles.badgeTextAdd : addedItems < 0 ? diffStyles.badgeTextRemove : diffStyles.badgeTextNeutral]}>
            {addedText}
          </Text>
        </View>
        {changedWalls > 0 && (
          <View style={[diffStyles.badge, diffStyles.badgeWall]}>
            <Text style={[diffStyles.badgeText, diffStyles.badgeTextWall]}>{wallText}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const diffStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeAdd: {
    backgroundColor: COLORS.success + '18',
    borderColor: COLORS.success + '40',
  },
  badgeRemove: {
    backgroundColor: COLORS.danger + '18',
    borderColor: COLORS.danger + '40',
  },
  badgeNeutral: {
    backgroundColor: COLORS.surfaceSecondary,
    borderColor: COLORS.border,
  },
  badgeWall: {
    backgroundColor: COLORS.primary + '18',
    borderColor: COLORS.primary + '40',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextAdd: { color: COLORS.success },
  badgeTextRemove: { color: COLORS.danger },
  badgeTextNeutral: { color: COLORS.textSecondary },
  badgeTextWall: { color: COLORS.primary },
});

export default function DesignHistoryScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getSnapshotsForProject, restoreSnapshot, saveSnapshot } = useHistory();
  const { projects, updateProject } = useFloorPlan();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAutoSaveInfo, setShowAutoSaveInfo] = useState(false);
  const autoSaveAnim = useRef(new Animated.Value(0)).current;

  const project = projects.find(p => p.id === projectId);
  const snapshots = getSnapshotsForProject(projectId ?? '');
  const reversedSnapshots = [...snapshots].reverse();

  const currentSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const selectedSnapshot = selectedId ? snapshots.find(s => s.id === selectedId) ?? null : null;
  const isCurrentSelected = selectedSnapshot?.id === currentSnapshot?.id;

  const lastSavedTime = currentSnapshot ? formatRelativeTime(currentSnapshot.timestamp) : null;

  useEffect(() => {
    if (showAutoSaveInfo) {
      Animated.sequence([
        Animated.timing(autoSaveAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(autoSaveAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setShowAutoSaveInfo(false));
    }
  }, [showAutoSaveInfo, autoSaveAnim]);

  const handleSelect = useCallback((id: string) => {
    console.log('[DesignHistory] Select snapshot:', id);
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const handleRestore = useCallback((snapshotId: string) => {
    if (!projectId || !project) return;
    const snap = snapshots.find(s => s.id === snapshotId);
    if (!snap) return;

    console.log('[DesignHistory] Restore button pressed — snapshot v' + snap.version + ' for project:', projectId);

    Alert.alert(
      'Restore version ' + snap.version + '?',
      'This will replace your current design with the state from ' + formatRelativeTime(snap.timestamp) + '. A snapshot of your current version will be saved first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            console.log('[DesignHistory] Confirmed restore — v' + snap.version + ' for project:', projectId);
            // Save current state before restoring
            if (project.rooms) {
              saveSnapshot(projectId, project.rooms, 'Auto-saved before restore to v' + snap.version);
            }
            const rooms = restoreSnapshot(projectId, snapshotId);
            if (rooms) {
              updateProject(projectId, { rooms });
              setSelectedId(null);
              router.back();
            }
          },
        },
      ]
    );
  }, [projectId, project, snapshots, restoreSnapshot, saveSnapshot, updateProject, router]);

  const handleRestoreSelected = useCallback(() => {
    if (selectedId) handleRestore(selectedId);
  }, [selectedId, handleRestore]);

  const canRestore = !!selectedId && !isCurrentSelected;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log('[DesignHistory] Close pressed');
            router.back();
          }}
          style={styles.headerBtn}
        >
          <X size={20} color={COLORS.text} />
        </AnimatedPressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Design History</Text>
          {project && <Text style={styles.headerSub} numberOfLines={1}>{project.name}</Text>}
        </View>

        <AnimatedPressable
          onPress={() => {
            if (!canRestore) return;
            console.log('[DesignHistory] Restore header button pressed');
            handleRestoreSelected();
          }}
          style={[styles.restoreHeaderBtn, !canRestore && styles.restoreHeaderBtnDisabled]}
          disabled={!canRestore}
        >
          <RotateCcw size={16} color={canRestore ? COLORS.accent : COLORS.textTertiary} />
          <Text style={[styles.restoreHeaderBtnText, !canRestore && { color: COLORS.textTertiary }]}>
            Restore
          </Text>
        </AnimatedPressable>
      </View>

      {/* Auto-save indicator */}
      <AnimatedPressable
        onPress={() => {
          console.log('[DesignHistory] Auto-save indicator tapped');
          setShowAutoSaveInfo(true);
        }}
        style={styles.autoSaveBar}
      >
        <View style={styles.autoSaveDot} />
        <Text style={styles.autoSaveText}>
          {lastSavedTime ? 'Auto-saved · ' + lastSavedTime : 'Auto-save is on'}
        </Text>
        <Info size={13} color={COLORS.textTertiary} />
      </AnimatedPressable>

      {showAutoSaveInfo && (
        <Animated.View style={[styles.autoSaveTooltip, { opacity: autoSaveAnim }]}>
          <Text style={styles.autoSaveTooltipText}>
            Auto-save is on — versions saved after each significant change
          </Text>
        </Animated.View>
      )}

      {/* Comparison panel */}
      {selectedSnapshot && !isCurrentSelected && currentSnapshot && (
        <View style={styles.comparisonPanel}>
          <DiffSummary current={currentSnapshot} selected={selectedSnapshot} />
          <View style={styles.comparisonPreviews}>
            <View style={styles.comparisonSide}>
              <Text style={styles.comparisonLabel}>Then</Text>
              <View style={styles.comparisonPreviewBox}>
                <Text style={styles.comparisonVersion}>v{selectedSnapshot.version}</Text>
                <Text style={styles.comparisonCounts}>
                  {selectedSnapshot.itemCount} items · {selectedSnapshot.wallCount} walls
                </Text>
              </View>
            </View>
            <View style={styles.comparisonArrow}>
              <Text style={styles.comparisonArrowText}>→</Text>
            </View>
            <View style={styles.comparisonSide}>
              <Text style={styles.comparisonLabel}>Now</Text>
              <View style={[styles.comparisonPreviewBox, styles.comparisonPreviewCurrent]}>
                <Text style={[styles.comparisonVersion, { color: COLORS.accent }]}>v{currentSnapshot.version}</Text>
                <Text style={styles.comparisonCounts}>
                  {currentSnapshot.itemCount} items · {currentSnapshot.wallCount} walls
                </Text>
              </View>
            </View>
          </View>

          <AnimatedPressable
            onPress={() => {
              console.log('[DesignHistory] Restore gradient button pressed');
              handleRestoreSelected();
            }}
            style={styles.restoreGradientWrap}
          >
            <LinearGradient
              colors={[COLORS.accent, '#00A88A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.restoreGradient}
            >
              <RotateCcw size={16} color="#fff" />
              <Text style={styles.restoreGradientText}>Restore to this version</Text>
            </LinearGradient>
          </AnimatedPressable>

          <Pressable
            onPress={() => {
              console.log('[DesignHistory] Keep current pressed');
              setSelectedId(null);
            }}
            style={styles.keepCurrentBtn}
          >
            <Text style={styles.keepCurrentText}>Keep current</Text>
          </Pressable>
        </View>
      )}

      {/* Timeline */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {snapshots.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Clock size={36} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptySub}>Start editing to build your history</Text>
          </View>
        ) : (
          reversedSnapshots.map((snapshot, index) => {
            const isCurrent = snapshot.id === currentSnapshot?.id;
            const isSelected = snapshot.id === selectedId;
            const isLast = index === reversedSnapshots.length - 1;

            return (
              <View key={snapshot.id} style={styles.timelineRow}>
                {/* Timeline dot + line */}
                <View style={styles.timelineTrack}>
                  <View style={[styles.dot, isCurrent ? styles.dotCurrent : styles.dotPast]}>
                    {isCurrent && <View style={styles.dotInner} />}
                  </View>
                  {!isLast && <View style={styles.line} />}
                </View>

                {/* Version card */}
                <View style={styles.cardWrap}>
                  <VersionCard
                    snapshot={snapshot}
                    isSelected={isSelected}
                    isCurrent={isCurrent}
                    onSelect={() => handleSelect(snapshot.id)}
                    onRestore={() => handleRestore(snapshot.id)}
                  />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  restoreHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  restoreHeaderBtnDisabled: {
    backgroundColor: COLORS.surfaceSecondary,
    borderColor: COLORS.border,
  },
  restoreHeaderBtnText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  autoSaveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  autoSaveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  autoSaveText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  autoSaveTooltip: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  autoSaveTooltipText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  comparisonPanel: {
    margin: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  comparisonPreviews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonSide: {
    flex: 1,
    gap: 6,
  },
  comparisonLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  comparisonPreviewBox: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comparisonPreviewCurrent: {
    borderColor: COLORS.accent + '40',
    backgroundColor: COLORS.accentMuted,
  },
  comparisonVersion: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  comparisonCounts: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  comparisonArrow: {
    width: 28,
    alignItems: 'center',
  },
  comparisonArrowText: {
    color: COLORS.textTertiary,
    fontSize: 20,
  },
  restoreGradientWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  restoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  restoreGradientText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  keepCurrentBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  keepCurrentText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  timelineTrack: {
    width: 20,
    alignItems: 'center',
    paddingTop: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotCurrent: {
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.accent + '60',
  },
  dotPast: {
    backgroundColor: COLORS.surfaceTertiary,
    borderWidth: 2,
    borderColor: COLORS.textTertiary + '60',
  },
  dotInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.divider,
    marginTop: 4,
    marginBottom: -4,
    minHeight: 16,
  },
  cardWrap: {
    flex: 1,
    paddingBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
