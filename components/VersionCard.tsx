import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ProjectSnapshot } from '@/contexts/HistoryContext';

export interface VersionCardProps {
  snapshot: ProjectSnapshot;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
  onRestore: () => void;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return 'Today, ' + timeStr;
  if (diffDays === 1) return 'Yesterday, ' + timeStr;
  if (diffDays < 7) return diffDays + ' days ago';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function MiniFloorPlan({ snapshot }: { snapshot: ProjectSnapshot }) {
  const room = snapshot.rooms[0];
  if (!room) return <View style={miniStyles.placeholder} />;

  const scaleX = 80 / (room.width || 600);
  const scaleY = 56 / (room.height || 450);
  const scale = Math.min(scaleX, scaleY);

  return (
    <View style={miniStyles.container}>
      <View
        style={[
          miniStyles.room,
          {
            width: (room.width || 600) * scale,
            height: (room.height || 450) * scale,
            backgroundColor: room.floorColor || '#E8E0D0',
          },
        ]}
      >
        {room.walls.slice(0, 4).map(wall => {
          const x1 = wall.x1 * scale;
          const y1 = wall.y1 * scale;
          const x2 = wall.x2 * scale;
          const y2 = wall.y2 * scale;
          const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
          return (
            <View
              key={wall.id}
              style={[
                miniStyles.wall,
                {
                  width: length,
                  left: x1,
                  top: y1,
                  transform: [{ rotate: angle + 'deg' }],
                  backgroundColor: room.wallColor || '#F5F5F0',
                },
              ]}
            />
          );
        })}
        {room.placedItems.slice(0, 6).map(item => (
          <View
            key={item.id}
            style={[
              miniStyles.item,
              {
                left: item.x * scale - 3,
                top: item.y * scale - 3,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: {
    width: 80,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 80,
    height: 56,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceTertiary,
  },
  room: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
  },
  wall: {
    position: 'absolute',
    height: 2,
    transformOrigin: '0 50%',
    opacity: 0.6,
  },
  item: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.7,
  },
});

export function VersionCard({ snapshot, isSelected, isCurrent, onSelect, onRestore }: VersionCardProps) {
  const versionLabel = isCurrent ? 'v' + snapshot.version + ' · Current' : 'v' + snapshot.version;
  const timestampLabel = formatTimestamp(snapshot.timestamp);
  const itemLabel = snapshot.itemCount + ' item' + (snapshot.itemCount !== 1 ? 's' : '') + ' · ' + snapshot.wallCount + ' walls';

  return (
    <AnimatedPressable
      onPress={() => {
        console.log('[VersionCard] Selected snapshot v' + snapshot.version + ' id:', snapshot.id);
        onSelect();
      }}
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        isCurrent && styles.cardCurrent,
      ]}
    >
      <View style={styles.row}>
        <MiniFloorPlan snapshot={snapshot} />
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={[styles.version, isCurrent && styles.versionCurrent]}>{versionLabel}</Text>
            {isCurrent && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>LIVE</Text></View>}
          </View>
          <Text style={styles.timestamp}>{timestampLabel}</Text>
          <Text style={styles.change} numberOfLines={2}>{snapshot.changeDescription}</Text>
          <Text style={styles.counts}>{itemLabel}</Text>
        </View>
      </View>

      {isSelected && !isCurrent && (
        <Pressable
          onPress={() => {
            console.log('[VersionCard] Restore pressed for snapshot v' + snapshot.version);
            onRestore();
          }}
          style={styles.restoreBtn}
        >
          <Text style={styles.restoreBtnText}>Restore this version</Text>
        </Pressable>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  cardCurrent: {
    borderColor: COLORS.accent + '60',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  version: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  versionCurrent: {
    color: COLORS.accent,
  },
  currentBadge: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  currentBadgeText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timestamp: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  change: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  counts: {
    color: COLORS.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  restoreBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  restoreBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
