import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';

export interface ActivityEntry {
  id: string;
  userName: string;
  userColor: string;
  action: string;
  timestamp: string;
}

interface ActivityFeedProps {
  entries: ActivityEntry[];
  maxHeight?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ActivityFeed({ entries, maxHeight = 220 }: ActivityFeedProps) {
  return (
    <ScrollView
      style={{ maxHeight }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {entries.map((entry) => {
        const initials = getInitials(entry.userName);
        return (
          <View key={entry.id} style={styles.row}>
            <View
              style={[
                styles.dot,
                { backgroundColor: entry.userColor + '33', borderColor: entry.userColor },
              ]}
            >
              <Text style={[styles.dotText, { color: entry.userColor }]}>{initials}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.action} numberOfLines={2}>
                {entry.action}
              </Text>
              <Text style={styles.timestamp}>{entry.timestamp}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  dotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  action: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  timestamp: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },
});
