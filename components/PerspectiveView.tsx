import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, G, Text as SvgText, Line, Defs, LinearGradient as SvgLinearGradient, Stop, Ellipse } from 'react-native-svg';
import { Room } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { COLORS } from '@/constants/Colors';

const { width: SCREEN_W } = Dimensions.get('window');

interface PerspectiveViewProps {
  room: Room;
  width?: number;
  height?: number;
  timeOfDay?: 'morning' | 'noon' | 'evening' | 'night';
  shadowIntensity?: number;
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

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function darken(hex: string, amount: number): string {
  return lighten(hex, -amount);
}

export function PerspectiveView({
  room,
  width = SCREEN_W,
  height = 400,
  timeOfDay = 'noon',
  shadowIntensity = 0.6,
}: PerspectiveViewProps) {
  // Room bounds
  const allX = room.walls.flatMap(w => [w.x1, w.x2]);
  const allY = room.walls.flatMap(w => [w.y1, w.y2]);
  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 400;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) : 300;
  const roomW = maxX - minX;
  const roomD = maxY - minY;

  const rawFloor = room.floorColor ?? '#C8A882';
  const rawWall = room.wallColor ?? '#E8E0D0';

  // Vanishing point — upper center
  const vpX = width * 0.5;
  const vpY = height * 0.28;

  // Ground plane corners in screen space (3/4 perspective)
  const groundY = height * 0.88;
  const groundLeft = width * 0.06;
  const groundRight = width * 0.94;
  const groundMidLeft = width * 0.22;
  const groundMidRight = width * 0.78;

  // Floor quad
  const floorPts = `${groundLeft},${groundY} ${groundRight},${groundY} ${groundMidRight},${vpY + 30} ${groundMidLeft},${vpY + 30}`;

  // Wall heights
  const wallTopY = vpY - 10;
  const wallBotY = groundY;

  // Left wall
  const leftWallPts = `${groundLeft},${wallBotY} ${groundMidLeft},${vpY + 30} ${groundMidLeft},${wallTopY} ${groundLeft},${wallTopY}`;
  // Right wall
  const rightWallPts = `${groundRight},${wallBotY} ${groundMidRight},${vpY + 30} ${groundMidRight},${wallTopY} ${groundRight},${wallTopY}`;
  // Back wall
  const backWallPts = `${groundMidLeft},${vpY + 30} ${groundMidRight},${vpY + 30} ${groundMidRight},${wallTopY} ${groundMidLeft},${wallTopY}`;

  // Perspective grid lines on floor
  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const gridCount = 7;
  for (let i = 0; i <= gridCount; i++) {
    const t = i / gridCount;
    const bx = groundLeft + (groundRight - groundLeft) * t;
    gridLines.push({ x1: bx, y1: groundY, x2: vpX, y2: vpY + 30 });
  }
  const hGridCount = 5;
  for (let i = 0; i <= hGridCount; i++) {
    const t = i / hGridCount;
    const y = groundY + (vpY + 30 - groundY) * t;
    const lx = groundLeft + (groundMidLeft - groundLeft) * t;
    const rx = groundRight + (groundMidRight - groundRight) * t;
    gridLines.push({ x1: lx, y1: y, x2: rx, y2: y });
  }

  // Map room coords to perspective screen coords
  function perspProject(rx: number, ry: number, rz: number): { x: number; y: number } {
    const nx = (rx - minX) / roomW; // 0..1
    const ny = (ry - minY) / roomD; // 0..1
    const nz = rz / 200; // 0..1 (height)

    // Bilinear interpolation on floor quad
    const bx = groundLeft + (groundRight - groundLeft) * nx;
    const tx = groundMidLeft + (groundMidRight - groundMidLeft) * nx;
    const screenX = bx + (tx - bx) * ny;
    const screenY = groundY + (vpY + 30 - groundY) * ny - nz * (groundY - wallTopY) * 0.7;
    return { x: screenX, y: screenY };
  }

  // Time-of-day tints
  const todWallTint: Record<string, string> = {
    morning: multiplyColor(rawWall, 0.92),
    noon: rawWall,
    evening: multiplyColor(rawWall, 0.85),
    night: multiplyColor(rawWall, 0.45),
  };
  const wallTinted = todWallTint[timeOfDay] ?? rawWall;
  const floorTinted = timeOfDay === 'night' ? multiplyColor(rawFloor, 0.4) : rawFloor;

  const shadowAlpha = shadowIntensity * 0.5;

  return (
    <View style={[styles.container, { width, height, backgroundColor: COLORS.background }]}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="perspFloor" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={floorTinted} stopOpacity="1" />
            <Stop offset="1" stopColor={darken(floorTinted, 25)} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="perspSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={timeOfDay === 'night' ? '#050A18' : timeOfDay === 'evening' ? '#1A0A00' : '#0A0E1A'} stopOpacity="1" />
            <Stop offset="1" stopColor={COLORS.background} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Sky/ceiling */}
        <Polygon
          points={`0,0 ${width},0 ${width},${vpY + 30} 0,${vpY + 30}`}
          fill="url(#perspSky)"
        />

        {/* Floor */}
        <Polygon points={floorPts} fill="url(#perspFloor)" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />

        {/* Perspective grid */}
        <G opacity={0.14}>
          {gridLines.map((l, i) => (
            <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={darken(rawFloor, 40)} strokeWidth={0.7} />
          ))}
        </G>

        {/* Back wall */}
        <Polygon points={backWallPts} fill={lighten(wallTinted, 10)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        {/* Left wall */}
        <Polygon points={leftWallPts} fill={multiplyColor(wallTinted, 0.72)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        {/* Right wall */}
        <Polygon points={rightWallPts} fill={multiplyColor(wallTinted, 0.85)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />

        {/* Furniture shadows */}
        {room.placedItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture) return null;
          const sc = perspProject(item.x, item.y, 0);
          return (
            <Ellipse
              key={`psh_${item.id}`}
              cx={sc.x + 4}
              cy={sc.y + 3}
              rx={furniture.width * 0.018}
              ry={furniture.depth * 0.009}
              fill="#000"
              opacity={shadowAlpha}
            />
          );
        })}

        {/* Furniture boxes */}
        {room.placedItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture) return null;

          const fw = furniture.width * 0.5;
          const fd = furniture.depth * 0.5;
          const fh = Math.max(20, furniture.height * 0.35);
          const fx = item.x;
          const fy = item.y;
          const fillColor = item.color ?? furniture.colors[0] ?? '#8B7355';

          const tFL = perspProject(fx - fw / 2, fy - fd / 2, fh);
          const tFR = perspProject(fx + fw / 2, fy - fd / 2, fh);
          const tBR = perspProject(fx + fw / 2, fy + fd / 2, fh);
          const tBL = perspProject(fx - fw / 2, fy + fd / 2, fh);
          const bBL = perspProject(fx - fw / 2, fy + fd / 2, 0);
          const bBR = perspProject(fx + fw / 2, fy + fd / 2, 0);
          const bFR = perspProject(fx + fw / 2, fy - fd / 2, 0);

          const topPts = [tFL, tFR, tBR, tBL].map(p => `${p.x},${p.y}`).join(' ');
          const frontPts = [tBL, tBR, bBR, bBL].map(p => `${p.x},${p.y}`).join(' ');
          const sidePts = [tFR, tBR, bBR, bFR].map(p => `${p.x},${p.y}`).join(' ');

          const emojiCx = (tFL.x + tFR.x + tBR.x + tBL.x) / 4;
          const emojyCy = (tFL.y + tFR.y + tBR.y + tBL.y) / 4;
          const emojiFontSize = Math.max(8, Math.min(14, fw * 0.04));

          return (
            <G key={item.id}>
              <Polygon points={frontPts} fill={multiplyColor(fillColor, 0.68)} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
              <Polygon points={sidePts} fill={multiplyColor(fillColor, 0.82)} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
              <Polygon points={topPts} fill={fillColor} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
              <SvgText x={emojiCx} y={emojyCy + 4} textAnchor="middle" fontSize={emojiFontSize}>
                {furniture.emoji}
              </SvgText>
            </G>
          );
        })}

        {/* Drag hint */}
        <SvgText
          x={width / 2}
          y={height - 12}
          textAnchor="middle"
          fontSize={10}
          fill={COLORS.textSecondary}
          opacity={0.6}
        >
          Drag to rotate
        </SvgText>

        {/* Room label */}
        <SvgText
          x={width / 2}
          y={vpY - 18}
          textAnchor="middle"
          fontSize={13}
          fontWeight="700"
          fill={COLORS.text}
          opacity={0.8}
        >
          {room.name}
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
