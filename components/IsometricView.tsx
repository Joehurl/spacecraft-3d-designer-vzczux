import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, G, Text as SvgText, Line, Rect } from 'react-native-svg';
import { Room } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { COLORS } from '@/constants/Colors';

const { width: SCREEN_W } = Dimensions.get('window');

type RenderMode = 'realistic' | 'wireframe' | 'blueprint';

interface IsometricViewProps {
  room: Room;
  rotationIndex: number; // 0-3
  renderMode: RenderMode;
  width?: number;
  height?: number;
}

const WALL_HEIGHT = 80; // visual wall height in iso units
const ISO_SCALE = 0.6;

function isoProject(x: number, y: number, z: number, scale: number, offsetX: number, offsetY: number) {
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  const isoX = (x - y) * cos30 * scale + offsetX;
  const isoY = (x + y) * sin30 * scale - z * scale + offsetY;
  return { x: isoX, y: isoY };
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function darken(hex: string, amount: number): string {
  return lighten(hex, -amount);
}

export function IsometricView({
  room,
  rotationIndex,
  renderMode,
  width = SCREEN_W,
  height = 400,
}: IsometricViewProps) {
  const offsetX = width / 2;
  const offsetY = height * 0.55;
  const scale = ISO_SCALE;

  const isBlueprint = renderMode === 'blueprint';
  const isWireframe = renderMode === 'wireframe';

  const bgColor = isBlueprint ? '#1a3a6b' : COLORS.background;
  const lineColor = isBlueprint ? '#60A5FA' : isWireframe ? COLORS.primary : COLORS.text;
  const strokeW = isWireframe ? 1.5 : 0.5;

  // Rotate room walls based on rotationIndex
  const angle = (rotationIndex * Math.PI) / 2;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  function rotatePoint(x: number, y: number) {
    return {
      x: x * cosA - y * sinA,
      y: x * sinA + y * cosA,
    };
  }

  function proj(x: number, y: number, z: number) {
    const r = rotatePoint(x * 0.5, y * 0.5);
    return isoProject(r.x, r.y, z, scale, offsetX, offsetY);
  }

  // Get room bounds
  const allX = room.walls.flatMap(w => [w.x1, w.x2]);
  const allY = room.walls.flatMap(w => [w.y1, w.y2]);
  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 400;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) : 300;

  const floorColor = room.floorColor;
  const wallColor = room.wallColor;

  // Floor corners
  const fl = proj(minX, minY, 0);
  const fr = proj(maxX, minY, 0);
  const fb = proj(maxX, maxY, 0);
  const fbl = proj(minX, maxY, 0);

  const floorPoints = `${fl.x},${fl.y} ${fr.x},${fr.y} ${fb.x},${fb.y} ${fbl.x},${fbl.y}`;

  // Wall faces
  const wh = WALL_HEIGHT;
  const walls = [
    // Front-left wall (bottom edge)
    {
      bottom: [proj(minX, maxY, 0), proj(maxX, maxY, 0)],
      top: [proj(minX, maxY, wh), proj(maxX, maxY, wh)],
      color: isBlueprint ? '#1a3a6b' : darken(wallColor, 30),
    },
    // Front-right wall (right edge)
    {
      bottom: [proj(maxX, minY, 0), proj(maxX, maxY, 0)],
      top: [proj(maxX, minY, wh), proj(maxX, maxY, wh)],
      color: isBlueprint ? '#1a3a6b' : darken(wallColor, 15),
    },
  ];

  return (
    <View style={[styles.container, { width, height, backgroundColor: bgColor }]}>
      <Svg width={width} height={height}>
        {/* Floor */}
        {!isWireframe && (
          <Polygon
            points={floorPoints}
            fill={isBlueprint ? '#1e4080' : floorColor}
            stroke={lineColor}
            strokeWidth={strokeW}
            opacity={0.9}
          />
        )}
        {isWireframe && (
          <Polygon
            points={floorPoints}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.5}
          />
        )}

        {/* Floor grid lines */}
        {!isWireframe && (
          <G opacity={0.15}>
            {Array.from({ length: 6 }).map((_, i) => {
              const t = (i + 1) / 7;
              const lx = minX + (maxX - minX) * t;
              const p1 = proj(lx, minY, 0);
              const p2 = proj(lx, maxY, 0);
              return <Line key={`vl${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={lineColor} strokeWidth={0.5} />;
            })}
            {Array.from({ length: 4 }).map((_, i) => {
              const t = (i + 1) / 5;
              const ly = minY + (maxY - minY) * t;
              const p1 = proj(minX, ly, 0);
              const p2 = proj(maxX, ly, 0);
              return <Line key={`hl${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={lineColor} strokeWidth={0.5} />;
            })}
          </G>
        )}

        {/* Walls */}
        {walls.map((wall, wi) => {
          const pts = [
            wall.bottom[0], wall.bottom[1],
            wall.top[1], wall.top[0],
          ].map(p => `${p.x},${p.y}`).join(' ');
          return (
            <Polygon
              key={wi}
              points={pts}
              fill={isWireframe ? 'none' : wall.color}
              stroke={lineColor}
              strokeWidth={strokeW}
              opacity={isBlueprint ? 0.6 : 0.9}
            />
          );
        })}

        {/* Back walls (top and left edges) */}
        {!isWireframe && (
          <>
            <Polygon
              points={[
                proj(minX, minY, 0), proj(maxX, minY, 0),
                proj(maxX, minY, wh), proj(minX, minY, wh),
              ].map(p => `${p.x},${p.y}`).join(' ')}
              fill={isBlueprint ? '#1a3a6b' : lighten(wallColor, 20)}
              stroke={lineColor}
              strokeWidth={strokeW}
              opacity={0.5}
            />
            <Polygon
              points={[
                proj(minX, minY, 0), proj(minX, maxY, 0),
                proj(minX, maxY, wh), proj(minX, minY, wh),
              ].map(p => `${p.x},${p.y}`).join(' ')}
              fill={isBlueprint ? '#1a3a6b' : lighten(wallColor, 10)}
              stroke={lineColor}
              strokeWidth={strokeW}
              opacity={0.5}
            />
          </>
        )}

        {/* Furniture items */}
        {room.placedItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture) return null;

          const fw = furniture.width * 0.5;
          const fd = furniture.depth * 0.5;
          const fh = furniture.height * 0.3;
          const fx = item.x;
          const fy = item.y;
          const fillColor = item.color ?? furniture.colors[0] ?? '#8B7355';

          // Top face
          const topFL = proj(fx - fw / 2, fy - fd / 2, fh);
          const topFR = proj(fx + fw / 2, fy - fd / 2, fh);
          const topBR = proj(fx + fw / 2, fy + fd / 2, fh);
          const topBL = proj(fx - fw / 2, fy + fd / 2, fh);
          const topPts = [topFL, topFR, topBR, topBL].map(p => `${p.x},${p.y}`).join(' ');

          // Left face
          const botBL = proj(fx - fw / 2, fy + fd / 2, 0);
          const botBR = proj(fx + fw / 2, fy + fd / 2, 0);
          const leftPts = [topBL, topBR, botBR, botBL].map(p => `${p.x},${p.y}`).join(' ');

          // Right face
          const botFR = proj(fx + fw / 2, fy - fd / 2, 0);
          const rightPts = [topFR, topBR, botBR, botFR].map(p => `${p.x},${p.y}`).join(' ');

          const topColor = isBlueprint ? '#2563EB' : isWireframe ? 'none' : lighten(fillColor, 40);
          const leftColor = isBlueprint ? '#1a3a6b' : isWireframe ? 'none' : darken(fillColor, 20);
          const rightColor = isBlueprint ? '#1e4080' : isWireframe ? 'none' : darken(fillColor, 40);
          const strokeColor = isBlueprint ? '#60A5FA' : isWireframe ? COLORS.primary : 'rgba(255,255,255,0.3)';

          const emojiCenter = {
            x: (topFL.x + topFR.x + topBR.x + topBL.x) / 4,
            y: (topFL.y + topFR.y + topBR.y + topBL.y) / 4,
          };

          return (
            <G key={item.id}>
              <Polygon points={leftPts} fill={leftColor} stroke={strokeColor} strokeWidth={0.5} />
              <Polygon points={rightPts} fill={rightColor} stroke={strokeColor} strokeWidth={0.5} />
              <Polygon points={topPts} fill={topColor} stroke={strokeColor} strokeWidth={0.5} />
              {!isBlueprint && (
                <SvgText
                  x={emojiCenter.x}
                  y={emojiCenter.y + 4}
                  textAnchor="middle"
                  fontSize={Math.max(8, Math.min(16, fw * scale * 0.4))}
                >
                  {furniture.emoji}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
