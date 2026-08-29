import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Text as SvgText, Line, Rect, Circle, Defs, Pattern } from 'react-native-svg';
import { Room } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';

const { width: SCREEN_W } = Dimensions.get('window');

const BP_BG = '#0A1628';
const BP_LINE = '#00D4FF';
const BP_DIM = '#00A8CC';
const BP_GRID = 'rgba(0,212,255,0.12)';
const BP_WALL = 'rgba(0,212,255,0.08)';

interface BlueprintViewProps {
  room: Room;
  width?: number;
  height?: number;
}

export function BlueprintView({ room, width = SCREEN_W, height = 400 }: BlueprintViewProps) {
  // Room bounds
  const allX = room.walls.flatMap(w => [w.x1, w.x2]);
  const allY = room.walls.flatMap(w => [w.y1, w.y2]);
  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 400;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) : 300;
  const roomW = maxX - minX;
  const roomD = maxY - minY;

  // Fit room into view with padding
  const padding = 60;
  const scaleX = (width - padding * 2) / roomW;
  const scaleY = (height - padding * 2) / roomD;
  const scale = Math.min(scaleX, scaleY, 0.9);
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

  // Grid spacing
  const gridStep = Math.max(20, Math.round(50 / scale) * scale);
  const gridLinesH: number[] = [];
  const gridLinesV: number[] = [];
  for (let gx = minX; gx <= maxX; gx += gridStep / scale) {
    gridLinesV.push(gx);
  }
  for (let gy = minY; gy <= maxY; gy += gridStep / scale) {
    gridLinesH.push(gy);
  }

  const roomArea = Math.round((roomW / 100) * (roomD / 100) * 10) / 10;

  return (
    <View style={[styles.container, { width, height, backgroundColor: BP_BG }]}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="bpGrid" x="0" y="0" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
            <Line x1="0" y1="0" x2={gridStep} y2="0" stroke={BP_GRID} strokeWidth={0.5} />
            <Line x1="0" y1="0" x2="0" y2={gridStep} stroke={BP_GRID} strokeWidth={0.5} />
          </Pattern>
        </Defs>

        {/* Full grid background */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#bpGrid)" />

        {/* Room floor fill */}
        <Rect
          x={originX}
          y={originY}
          width={drawW}
          height={drawH}
          fill={BP_WALL}
          stroke={BP_LINE}
          strokeWidth={1.5}
        />

        {/* Walls */}
        {room.walls.map(wall => {
          const s = toScreen(wall.x1, wall.y1);
          const e = toScreen(wall.x2, wall.y2);
          const thickness = Math.max(3, (wall.thickness ?? 10) * scale);
          return (
            <Line
              key={wall.id}
              x1={s.x}
              y1={s.y}
              x2={e.x}
              y2={e.y}
              stroke={BP_LINE}
              strokeWidth={thickness}
              strokeLinecap="square"
            />
          );
        })}

        {/* Furniture outlines */}
        {room.placedItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture) return null;
          const fw = furniture.width * scale;
          const fd = furniture.depth * scale;
          const sc = toScreen(item.x - furniture.width / 2, item.y - furniture.depth / 2);
          const cx = sc.x + fw / 2;
          const cy = sc.y + fd / 2;
          const labelText = furniture.name.slice(0, 6).toUpperCase();
          return (
            <G key={item.id}>
              <Rect
                x={sc.x}
                y={sc.y}
                width={fw}
                height={fd}
                fill="none"
                stroke={BP_LINE}
                strokeWidth={1}
                strokeDasharray="3,2"
                opacity={0.8}
              />
              <SvgText
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                fontSize={Math.max(6, Math.min(9, fw * 0.18))}
                fill={BP_LINE}
                opacity={0.65}
              >
                {labelText}
              </SvgText>
            </G>
          );
        })}

        {/* Dimension lines — horizontal */}
        {(() => {
          const dimY = originY + drawH + 22;
          const s = toScreen(minX, minY);
          const e = toScreen(maxX, minY);
          return (
            <G>
              <Line x1={originX} y1={dimY} x2={originX + drawW} y2={dimY} stroke={BP_DIM} strokeWidth={1} />
              <Line x1={originX} y1={dimY - 5} x2={originX} y2={dimY + 5} stroke={BP_DIM} strokeWidth={1} />
              <Line x1={originX + drawW} y1={dimY - 5} x2={originX + drawW} y2={dimY + 5} stroke={BP_DIM} strokeWidth={1} />
              <SvgText
                x={(originX + originX + drawW) / 2}
                y={dimY + 12}
                textAnchor="middle"
                fontSize={9}
                fill={BP_DIM}
              >
                {Math.round(roomW / 10)} cm
              </SvgText>
            </G>
          );
        })()}

        {/* Dimension lines — vertical */}
        {(() => {
          const dimX = originX - 22;
          return (
            <G>
              <Line x1={dimX} y1={originY} x2={dimX} y2={originY + drawH} stroke={BP_DIM} strokeWidth={1} />
              <Line x1={dimX - 5} y1={originY} x2={dimX + 5} y2={originY} stroke={BP_DIM} strokeWidth={1} />
              <Line x1={dimX - 5} y1={originY + drawH} x2={dimX + 5} y2={originY + drawH} stroke={BP_DIM} strokeWidth={1} />
              <SvgText
                x={dimX - 12}
                y={(originY + originY + drawH) / 2}
                textAnchor="middle"
                fontSize={9}
                fill={BP_DIM}
                rotation={-90}
                originX={dimX - 12}
                originY={(originY + originY + drawH) / 2}
              >
                {Math.round(roomD / 10)} cm
              </SvgText>
            </G>
          );
        })()}

        {/* Corner dots */}
        {[
          toScreen(minX, minY),
          toScreen(maxX, minY),
          toScreen(maxX, maxY),
          toScreen(minX, maxY),
        ].map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={3} fill={BP_LINE} opacity={0.9} />
        ))}

        {/* Room name + area */}
        <SvgText
          x={width / 2}
          y={originY - 18}
          textAnchor="middle"
          fontSize={13}
          fontWeight="700"
          fill={BP_LINE}
        >
          {room.name.toUpperCase()}
        </SvgText>
        <SvgText
          x={width / 2}
          y={originY - 6}
          textAnchor="middle"
          fontSize={9}
          fill={BP_DIM}
          opacity={0.8}
        >
          {roomArea} m²
        </SvgText>

        {/* Watermark */}
        <SvgText
          x={width - 10}
          y={height - 8}
          textAnchor="end"
          fontSize={8}
          fill={BP_LINE}
          opacity={0.25}
          fontWeight="700"
        >
          SPACECRAFT 3D
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
