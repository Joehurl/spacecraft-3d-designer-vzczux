import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Text as SvgText, Line, Rect, Polygon, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Room } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { COLORS } from '@/constants/Colors';

const { width: SCREEN_W } = Dimensions.get('window');

interface DollhouseViewProps {
  room: Room;
  width?: number;
  height?: number;
  timeOfDay?: 'morning' | 'noon' | 'evening' | 'night';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function multiplyColor(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function DollhouseView({ room, width = SCREEN_W, height = 400, timeOfDay = 'noon' }: DollhouseViewProps) {
  const allX = room.walls.flatMap(w => [w.x1, w.x2]);
  const allY = room.walls.flatMap(w => [w.y1, w.y2]);
  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 400;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) : 300;
  const roomW = maxX - minX;
  const roomD = maxY - minY;

  const padding = 50;
  const scaleX = (width - padding * 2) / roomW;
  const scaleY = (height - padding * 2) / roomD;
  const scale = Math.min(scaleX, scaleY, 0.85);
  const drawW = roomW * scale;
  const drawH = roomD * scale;
  const originX = (width - drawW) / 2;
  const originY = (height - drawH) / 2;

  function toScreen(rx: number, ry: number): { x: number; y: number } {
    return {
      x: originX + (rx - minX) * scale,
      y: originY + (ry - minY) * scale,
    };
  }

  const rawFloor = room.floorColor ?? '#C8A882';
  const rawWall = room.wallColor ?? '#E8E0D0';

  const floorTinted = timeOfDay === 'night' ? multiplyColor(rawFloor, 0.4) : rawFloor;
  const wallTinted = timeOfDay === 'night' ? multiplyColor(rawWall, 0.35) : multiplyColor(rawWall, 0.6);

  const wallThickness = Math.max(6, 12 * scale);

  return (
    <View style={[styles.container, { width, height, backgroundColor: COLORS.background }]}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="dhFloor" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={floorTinted} stopOpacity="1" />
            <Stop offset="1" stopColor={multiplyColor(floorTinted, 0.82)} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="dhShadow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#000" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>

        {/* Drop shadow for room */}
        <Rect
          x={originX + 6}
          y={originY + 6}
          width={drawW}
          height={drawH}
          fill="url(#dhShadow)"
          rx={4}
        />

        {/* Floor */}
        <Rect
          x={originX}
          y={originY}
          width={drawW}
          height={drawH}
          fill="url(#dhFloor)"
          rx={2}
        />

        {/* Floor texture lines */}
        <G opacity={0.15}>
          {Array.from({ length: Math.round(drawW / 20) }).map((_, i) => {
            const x = originX + (i + 1) * (drawW / Math.round(drawW / 20));
            return (
              <Line key={`fv${i}`} x1={x} y1={originY} x2={x} y2={originY + drawH} stroke={multiplyColor(rawFloor, 0.5)} strokeWidth={0.8} />
            );
          })}
        </G>

        {/* Furniture top-view shapes */}
        {room.placedItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture) return null;
          const fw = furniture.width * scale;
          const fd = furniture.depth * scale;
          const sc = toScreen(item.x - furniture.width / 2, item.y - furniture.depth / 2);
          const fillColor = item.color ?? furniture.colors[0] ?? '#8B7355';
          const cx = sc.x + fw / 2;
          const cy = sc.y + fd / 2;
          const emojiFontSize = Math.max(8, Math.min(16, Math.min(fw, fd) * 0.45));
          return (
            <G key={item.id}>
              {/* Shadow */}
              <Rect
                x={sc.x + 3}
                y={sc.y + 3}
                width={fw}
                height={fd}
                fill="#000"
                opacity={0.25}
                rx={2}
              />
              {/* Body */}
              <Rect
                x={sc.x}
                y={sc.y}
                width={fw}
                height={fd}
                fill={fillColor}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={0.8}
                rx={2}
              />
              <SvgText x={cx} y={cy + 4} textAnchor="middle" fontSize={emojiFontSize}>
                {furniture.emoji}
              </SvgText>
            </G>
          );
        })}

        {/* Walls as thick rectangles */}
        {room.walls.map(wall => {
          const s = toScreen(wall.x1, wall.y1);
          const e = toScreen(wall.x2, wall.y2);
          return (
            <Line
              key={wall.id}
              x1={s.x}
              y1={s.y}
              x2={e.x}
              y2={e.y}
              stroke={wallTinted}
              strokeWidth={wallThickness}
              strokeLinecap="square"
            />
          );
        })}

        {/* Wall outlines */}
        {room.walls.map(wall => {
          const s = toScreen(wall.x1, wall.y1);
          const e = toScreen(wall.x2, wall.y2);
          return (
            <Line
              key={`wo_${wall.id}`}
              x1={s.x}
              y1={s.y}
              x2={e.x}
              y2={e.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={wallThickness + 1}
              strokeLinecap="square"
            />
          );
        })}

        {/* Re-draw walls on top */}
        {room.walls.map(wall => {
          const s = toScreen(wall.x1, wall.y1);
          const e = toScreen(wall.x2, wall.y2);
          return (
            <Line
              key={`wt_${wall.id}`}
              x1={s.x}
              y1={s.y}
              x2={e.x}
              y2={e.y}
              stroke={wallTinted}
              strokeWidth={wallThickness}
              strokeLinecap="square"
            />
          );
        })}

        {/* Corner dots */}
        {[
          toScreen(minX, minY),
          toScreen(maxX, minY),
          toScreen(maxX, maxY),
          toScreen(minX, maxY),
        ].map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={wallThickness / 2} fill={wallTinted} />
        ))}

        {/* Room label */}
        <SvgText
          x={width / 2}
          y={originY - 12}
          textAnchor="middle"
          fontSize={13}
          fontWeight="700"
          fill={COLORS.text}
          opacity={0.85}
        >
          {room.name}
        </SvgText>
        <SvgText
          x={width / 2}
          y={originY - 1}
          textAnchor="middle"
          fontSize={9}
          fill={COLORS.textSecondary}
          opacity={0.7}
        >
          Top-down view
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
