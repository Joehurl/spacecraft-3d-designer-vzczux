import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { FloorPlan } from '@/types';
import { RoomPreview } from '@/components/RoomPreview';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CollaboratorAvatar } from '@/components/CollaboratorAvatar';

// Simulated collaborators per project (deterministic by project index)
const COLLAB_POOLS = [
  [{ name: 'Alex Chen', color: '#4F8EF7' }, { name: 'Sarah Kim', color: '#00D4AA' }],
  [{ name: 'Marcus Lee', color: '#A78BFA' }, { name: 'Jordan Wu', color: '#F472B6' }, { name: 'Alex Chen', color: '#4F8EF7' }],
  [{ name: 'Sarah Kim', color: '#00D4AA' }, { name: 'Marcus Lee', color: '#A78BFA' }],
];

interface ProjectCardProps {
  project: FloorPlan;
  onPress: () => void;
  onLongPress?: () => void;
  index: number;
}

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

const STYLE_COLORS: Record<string, string> = {
  modern: '#4F8EF7',
  scandinavian: '#00D4AA',
  industrial: '#F59E0B',
  bohemian: '#A78BFA',
  minimalist: '#94A3B8',
  classic: '#F472B6',
};

export function ProjectCard({ project, onPress, onLongPress, index }: ProjectCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const styleColor = STYLE_COLORS[project.style] ?? COLORS.primary;
  const roomCount = project.rooms.length;
  const relativeDate = getRelativeDate(project.updatedAt);
  const styleLabel = project.style.charAt(0).toUpperCase() + project.style.slice(1);
  const areaDisplay = String(project.totalArea);
  const collabPool = COLLAB_POOLS[index % COLLAB_POOLS.length];

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={onPress} onLongPress={onLongPress} style={styles.card}>
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          <RoomPreview project={project} width={160} height={140} />
          <View style={styles.thumbnailOverlay} />
          <View style={styles.styleBadge}>
            <View style={[styles.styleDot, { backgroundColor: styleColor }]} />
            <Text style={styles.styleBadgeText}>{styleLabel}</Text>
          </View>
          {/* Collaborator avatar stack */}
          <View style={styles.collabStack}>
            {collabPool.map((c, i) => (
              <View
                key={c.name}
                style={[
                  styles.collabAvatarWrap,
                  { marginLeft: i === 0 ? 0 : -8, zIndex: collabPool.length - i },
                ]}
              >
                <CollaboratorAvatar name={c.name} color={c.color} size={22} showStatus={false} />
              </View>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{roomCount}</Text>
            <Text style={styles.metaSep}> room{roomCount !== 1 ? 's' : ''} · </Text>
            <Text style={styles.metaText}>{areaDisplay}</Text>
            <Text style={styles.metaSep}> m²</Text>
          </View>
          <Text style={styles.date}>{relativeDate}</Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
  },
  thumbnail: {
    height: 140,
    backgroundColor: COLORS.surfaceSecondary,
    overflow: 'hidden',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.3)',
  },
  styleBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,14,26,0.75)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  styleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  styleBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  info: {
    padding: 12,
    gap: 3,
  },
  name: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  metaSep: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  date: {
    color: COLORS.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  collabStack: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collabAvatarWrap: {
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
});
