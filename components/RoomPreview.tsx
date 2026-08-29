import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Line, Path, Text as SvgText, G } from 'react-native-svg';
import { FloorPlan } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { COLORS } from '@/constants/Colors';

interface RoomPreviewProps {
  project: FloorPlan;
  width: number;
  height: number;
}

export function RoomPreview({ project, width, height }: RoomPreviewProps) {
  const room = project.rooms[0];
  if (!room || room.walls.length === 0) {
    return (
      <View style={{ width, height, backgroundColor: COLORS.surfaceSecondary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
        <SvgText fill={COLORS.textTertiary} fontSize={24}>🏠</SvgText>
      </View>
    );
  }

  // Calculate bounding box of walls
  const allX = room.walls.flatMap(w => [w.x1, w.x2]);
  const allY = room.walls.flatMap(w => [w.y1, w.y2]);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const roomW = maxX - minX;
  const roomH = maxY - minY;

  const padding = 12;
  const scaleX = (width - padding * 2) / (roomW || 1);
  const scaleY = (height - padding * 2) / (roomH || 1);
  const scale = Math.min(scaleX, scaleY);

  const tx = (x: number) => (x - minX) * scale + padding;
  const ty = (y: number) => (y - minY) * scale + padding;

  return (
    <Svg width={width} height={height}>
      {/* Floor fill */}
      <Rect
        x={tx(minX)}
        y={ty(minY)}
        width={roomW * scale}
        height={roomH * scale}
        fill={room.floorColor}
        opacity={0.6}
      />

      {/* Placed items */}
      {room.placedItems.map(item => {
        const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
        if (!furniture) return null;
        const iw = furniture.width * scale;
        const id = furniture.depth * scale;
        const ix = tx(item.x) - iw / 2;
        const iy = ty(item.y) - id / 2;
        const cx = tx(item.x);
        const cy = ty(item.y);
        return (
          <G key={item.id} rotation={item.rotation} origin={`${cx}, ${cy}`}>
            <Rect
              x={ix}
              y={iy}
              width={iw}
              height={id}
              fill={item.color ?? '#8B7355'}
              opacity={0.7}
              rx={2}
            />
          </G>
        );
      })}

      {/* Walls */}
      {room.walls.map(wall => (
        <Line
          key={wall.id}
          x1={tx(wall.x1)}
          y1={ty(wall.y1)}
          x2={tx(wall.x2)}
          y2={ty(wall.y2)}
          stroke={COLORS.text}
          strokeWidth={Math.max(2, wall.thickness * scale * 0.5)}
          strokeLinecap="round"
        />
      ))}

      {/* Doors */}
      {room.doors.map(door => {
        const wall = room.walls.find(w => w.id === door.wallId);
        if (!wall) return null;
        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const px = wall.x1 + dx * door.position;
        const py = wall.y1 + dy * door.position;
        const doorW = door.width * scale;
        const nx = -dy / len;
        const ny = dx / len;
        const ex = px + (dx / len) * door.width;
        const ey = py + (dy / len) * door.width;
        return (
          <G key={door.id}>
            <Line
              x1={tx(px)} y1={ty(py)}
              x2={tx(px + nx * door.width * 0.5)} y2={ty(py + ny * door.width * 0.5)}
              stroke={COLORS.accent}
              strokeWidth={1}
              strokeDasharray="3,2"
            />
          </G>
        );
      })}
    </Svg>
  );
}
