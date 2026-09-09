import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { Room, FloorPlan, FurnitureItem } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';

export function calculateStyleScore(
  room: Room,
  projectStyle: FloorPlan['style'],
): number {
  if (room.placedItems.length === 0) return 0;

  const placedFurniture = room.placedItems
    .map(item => FURNITURE_CATALOG.find(f => f.id === item.furnitureId))
    .filter(Boolean) as FurnitureItem[];

  if (placedFurniture.length === 0) return 0;

  const styleMatches = placedFurniture.filter(f => f.style.includes(projectStyle)).length;
  const styleScore = (styleMatches / placedFurniture.length) * 60;

  const categories = new Set(placedFurniture.map(f => f.category));
  const varietyScore = Math.min(categories.size / 3, 1) * 20;

  const hasSeating = placedFurniture.some(f => f.category === 'seating');
  const hasTables = placedFurniture.some(f => f.category === 'tables');
  const completenessScore = (hasSeating ? 10 : 0) + (hasTables ? 10 : 0);

  return Math.round(styleScore + varietyScore + completenessScore);
}

function getScoreColor(score: number): string {
  if (score < 40) return COLORS.danger;
  if (score < 70) return COLORS.warning;
  return COLORS.success;
}

function getScoreGrade(score: number): string {
  if (score < 40) return 'Needs Work';
  if (score < 60) return 'Good Start';
  if (score < 80) return 'Well Styled';
  return 'Designer Pick';
}

interface StyleScoreProps {
  score: number;
  label?: string;
  size?: 'sm' | 'lg';
}

export function StyleScore({ score, label = 'Style Coherence', size = 'sm' }: StyleScoreProps) {
  const color = getScoreColor(score);
  const grade = getScoreGrade(score);

  if (size === 'lg') {
    return (
      <View style={lgStyles.container}>
        <View style={[lgStyles.ring, { borderColor: color }]}>
          <Text style={[lgStyles.scoreNum, { color }]}>{score}</Text>
          <Text style={lgStyles.scoreMax}>/100</Text>
        </View>
        <Text style={lgStyles.label}>{label}</Text>
        <View style={[lgStyles.gradeBadge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
          <Text style={[lgStyles.gradeText, { color }]}>{grade}</Text>
        </View>
      </View>
    );
  }

  // Small version
  const pct = score / 100;
  return (
    <View style={smStyles.container}>
      <View style={smStyles.labelRow}>
        <Text style={smStyles.label}>{label}</Text>
        <Text style={[smStyles.score, { color }]}>{score}/100</Text>
      </View>
      <View style={smStyles.track}>
        <View style={[smStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[smStyles.grade, { color }]}>{grade}</Text>
    </View>
  );
}

const lgStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
  },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    flexDirection: 'row',
    gap: 2,
  },
  scoreNum: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scoreMax: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  gradeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

const smStyles = StyleSheet.create({
  container: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  score: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceTertiary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  grade: {
    fontSize: 10,
    fontWeight: '600',
  },
});
