import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';

export interface CollaboratorAvatarProps {
  name: string;
  color: string;
  size?: number;
  status?: 'online' | 'away' | 'editing' | 'offline';
  showStatus?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  online: COLORS.success,
  away: COLORS.warning,
  editing: COLORS.primary,
  offline: COLORS.textTertiary,
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function CollaboratorAvatar({
  name,
  color,
  size = 36,
  status = 'offline',
  showStatus = true,
}: CollaboratorAvatarProps) {
  const initials = getInitials(name);
  const dotSize = Math.max(8, size * 0.28);
  const fontSize = size * 0.36;
  const statusColor = STATUS_COLORS[status] ?? COLORS.textTertiary;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color + '33',
            borderColor: color,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize, color }]}>{initials}</Text>
      </View>
      {showStatus && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: statusColor,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
});
