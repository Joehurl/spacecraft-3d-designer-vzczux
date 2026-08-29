import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Ellipse, G, Text as SvgText, Line, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Room } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';
import { COLORS } from '@/constants/Colors';

const { width: SCREEN_W } = Dimensions.get('window');

export type RenderMode = 'isometric' | 'perspective' | 'blueprint' | 'dollhouse';

interface IsometricViewProps {
  room: Room;
  rotationIndex: number; // 0-3
  renderMode?: RenderMode;
  width?: number;
  height?: number;
  timeOfDay?: 'morning' | 'noon' | 'evening' | 'night';
  shadowIntensity?: number; // 0-1
  ambientLight?: boolean;
}

const WALL_HEIGHT = 90;
const ISO_SCALE = 0.6;

function isoProject(x: number, y: number, z: number, scale: number, offsetX: number, offsetY: number) {
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  const isoX = (x - y) * cos30 * scale + offsetX;
  const isoY = (x + y) * sin30 * scale - z * scale + offsetY;
  return { x: isoX, y: isoY };
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

function blendColor(hex: string, tintR: number, tintG: number, tintB: number, strength: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r * (1 - strength) + tintR * strength,
    g * (1 - strength) + tintG * strength,
    b * (1 - strength) + tintB * strength,
  );
}

export function IsometricView({
  room,
  rotationIndex,
  renderMode = 'isometric',
  width = SCREEN_W,
  height = 400,
  timeOfDay = 'noon',
  shadowIntensity = 0.6,
  ambientLight = true,
}: IsometricViewProps) {
  const offsetX = width / 2;
  const offsetY = height * 0.55;
  const scale = ISO_SCALE;

  const isBlueprint = renderMode === 'blueprint';

  // Time-of-day tint
  const todTint: Record<string, [number, number, number, number]> = {
    morning: [255, 160, 80, 0.12],
    noon: [255, 255, 255, 0],
    evening: [255, 120, 40, 0.18],
    night: [40, 60, 140, 0.28],
  };
  const [tR, tG, tB, tStr] = todTint[timeOfDay] ?? [255, 255, 255, 0];

  function applyTod(hex: string): string {
    if (tStr === 0) return hex;
    return blendColor(hex, tR, tG, tB, tStr);
  }

  // Rotation
  const angle = (rotationIndex * Math.PI) / 2;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  function rotatePoint(x: number, y: number) {
    return { x: x * cosA - y * sinA, y: x * sinA + y * cosA };
  }

  function proj(x: number, y: number, z: number) {
    const r = rotatePoint(x * 0.5, y * 0.5);
    return isoProject(r.x, r.y, z, scale, offsetX, offsetY);
  }

  // Room bounds
  const allX = room.walls.flatMap(w => [w.x1, w.x2]);
  const allY = room.walls.flatMap(w => [w.y1, w.y2]);
  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 400;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) : 300;

  const roomW = maxX - minX;
  const roomD = maxY - minY;

  const rawFloorColor = room.floorColor ?? '#C8A882';
  const rawWallColor = room.wallColor ?? '#E8E0D0';
  const floorColor = applyTod(rawFloorColor);
  const wallColor = applyTod(rawWallColor);

  const wh = WALL_HEIGHT;

  // Floor corners
  const fl = proj(minX, minY, 0);
  const fr = proj(maxX, minY, 0);
  const fb = proj(maxX, maxY, 0);
  const fbl = proj(minX, maxY, 0);
  const floorPoints = `${fl.x},${fl.y} ${fr.x},${fr.y} ${fb.x},${fb.y} ${fbl.x},${fbl.y}`;

  // Blueprint colors
  const BP_BG = '#0A1628';
  const BP_LINE = '#00D4FF';
  const BP_FILL = '#0D1F3C';
  const BP_WALL = '#0A1628';

  const bgColor = isBlueprint ? BP_BG : COLORS.background;

  // Night window glow
  const nightGlow = timeOfDay === 'night';

  // Plank count for floor texture
  const plankCountX = Math.max(4, Math.round(roomW / 60));
  const plankCountY = Math.max(3, Math.round(roomD / 60));

  // Shadow intensity factor
  const shadowAlpha = ambientLight ? shadowIntensity * 0.55 : shadowIntensity * 0.35;

  return (
    <View style={[styles.container, { width, height, backgroundColor: bgColor }]}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="floorGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={isBlueprint ? BP_FILL : lighten(floorColor, 15)} stopOpacity="1" />
            <Stop offset="1" stopColor={isBlueprint ? BP_WALL : darken(floorColor, 20)} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="wallLeftGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={isBlueprint ? BP_WALL : multiplyColor(wallColor, 0.65)} stopOpacity="1" />
            <Stop offset="1" stopColor={isBlueprint ? BP_WALL : multiplyColor(wallColor, 0.75)} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="wallRightGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={isBlueprint ? BP_WALL : multiplyColor(wallColor, 0.82)} stopOpacity="1" />
            <Stop offset="1" stopColor={isBlueprint ? BP_WALL : multiplyColor(wallColor, 0.88)} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* ── FLOOR ── */}
        <Polygon
          points={floorPoints}
          fill={isBlueprint ? BP_FILL : 'url(#floorGrad)'}
          stroke={isBlueprint ? BP_LINE : 'rgba(255,255,255,0.08)'}
          strokeWidth={isBlueprint ? 1 : 0.5}
        />

        {/* Floor wood plank texture */}
        {!isBlueprint && (
          <G opacity={0.18}>
            {Array.from({ length: plankCountX + 1 }).map((_, i) => {
              const t = i / plankCountX;
              const lx = minX + roomW * t;
              const p1 = proj(lx, minY, 0);
              const p2 = proj(lx, maxY, 0);
              return <Line key={`px${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={darken(rawFloorColor, 40)} strokeWidth={0.8} />;
            })}
            {Array.from({ length: plankCountY + 1 }).map((_, i) => {
              const t = i / plankCountY;
              const ly = minY + roomD * t;
              const p1 = proj(minX, ly, 0);
              const p2 = proj(maxX, ly, 0);
              return <Line key={`py${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={darken(rawFloorColor, 40)} strokeWidth={0.8} />;
            })}
          </G>
        )}

        {/* Blueprint grid overlay */}
        {isBlueprint && (
          <G opacity={0.25}>
            {Array.from({ length: 8 }).map((_, i) => {
              const t = (i + 1) / 9;
              const lx = minX + roomW * t;
              const p1 = proj(lx, minY, 0);
              const p2 = proj(lx, maxY, 0);
              return <Line key={`bpx${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={BP_LINE} strokeWidth={0.5} />;
            })}
            {Array.from({ length: 6 }).map((_, i) => {
              const t = (i + 1) / 7;
              const ly = minY + roomD * t;
              const p1 = proj(minX, ly, 0);
              const p2 = proj(maxX, ly, 0);
              return <Line key={`bpy${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={BP_LINE} strokeWidth={0.5} />;
            })}
          </G>
        )}

        {/* ── BACK WALLS (hidden faces, lighter) ── */}
        <Polygon
          points={[
            proj(minX, minY, 0), proj(maxX, minY, 0),
            proj(maxX, minY, wh), proj(minX, minY, wh),
          ].map(p => `${p.x},${p.y}`).join(' ')}
          fill={isBlueprint ? BP_WALL : multiplyColor(wallColor, 0.55)}
          stroke={isBlueprint ? BP_LINE : 'rgba(255,255,255,0.06)'}
          strokeWidth={isBlueprint ? 1 : 0.5}
          opacity={0.6}
        />
        <Polygon
          points={[
            proj(minX, minY, 0), proj(minX, maxY, 0),
            proj(minX, maxY, wh), proj(minX, minY, wh),
          ].map(p => `${p.x},${p.y}`).join(' ')}
          fill={isBlueprint ? BP_WALL : multiplyColor(wallColor, 0.6)}
          stroke={isBlueprint ? BP_LINE : 'rgba(255,255,255,0.06)'}
          strokeWidth={isBlueprint ? 1 : 0.5}
          opacity={0.6}
        />

        {/* ── FRONT WALLS ── */}
        {/* Left wall (bottom edge) — darkest */}
        <Polygon
          points={[
            proj(minX, maxY, 0), proj(maxX, maxY, 0),
            proj(maxX, maxY, wh), proj(minX, maxY, wh),
          ].map(p => `${p.x},${p.y}`).join(' ')}
          fill={isBlueprint ? BP_WALL : 'url(#wallLeftGrad)'}
          stroke={isBlueprint ? BP_LINE : 'rgba(255,255,255,0.1)'}
          strokeWidth={isBlueprint ? 1 : 0.5}
        />
        {/* Right wall (right edge) — medium */}
        <Polygon
          points={[
            proj(maxX, minY, 0), proj(maxX, maxY, 0),
            proj(maxX, maxY, wh), proj(maxX, minY, wh),
          ].map(p => `${p.x},${p.y}`).join(' ')}
          fill={isBlueprint ? BP_WALL : 'url(#wallRightGrad)'}
          stroke={isBlueprint ? BP_LINE : 'rgba(255,255,255,0.1)'}
          strokeWidth={isBlueprint ? 1 : 0.5}
        />

        {/* Ambient occlusion — darker corners where walls meet floor */}
        {!isBlueprint && (
          <G opacity={0.22}>
            {/* Bottom-left corner */}
            <Polygon
              points={[
                proj(minX, maxY - roomD * 0.12, 0),
                proj(minX + roomW * 0.12, maxY, 0),
                proj(minX, maxY, 0),
              ].map(p => `${p.x},${p.y}`).join(' ')}
              fill="#000"
            />
            {/* Bottom-right corner */}
            <Polygon
              points={[
                proj(maxX - roomW * 0.12, maxY, 0),
                proj(maxX, maxY - roomD * 0.12, 0),
                proj(maxX, maxY, 0),
              ].map(p => `${p.x},${p.y}`).join(' ')}
              fill="#000"
            />
          </G>
        )}

        {/* Night window glow on walls */}
        {nightGlow && (
          <G opacity={0.35}>
            <Rect
              x={proj(maxX * 0.3, maxY, 0).x - 10}
              y={proj(maxX * 0.3, maxY, wh * 0.5).y - 15}
              width={20}
              height={25}
              fill="#FFD700"
              rx={2}
            />
          </G>
        )}

        {/* ── FURNITURE SHADOWS ── */}
        {room.placedItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture || isBlueprint) return null;
          const fw = furniture.width * 0.5;
          const fd = furniture.depth * 0.5;
          const shadowCenter = proj(item.x + fw * 0.15, item.y + fd * 0.15, 0);
          const rx = Math.max(6, fw * scale * 0.55);
          const ry = Math.max(4, fd * scale * 0.28);
          return (
            <Ellipse
              key={`sh_${item.id}`}
              cx={shadowCenter.x}
              cy={shadowCenter.y}
              rx={rx}
              ry={ry}
              fill="#000"
              opacity={shadowAlpha}
            />
          );
        })}

        {/* ── FURNITURE BOXES ── */}
        {room.placedItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture) return null;

          const fw = furniture.width * 0.5;
          const fd = furniture.depth * 0.5;
          const fh = Math.max(20, furniture.height * 0.35);
          const fx = item.x;
          const fy = item.y;
          const rawFill = item.color ?? furniture.colors[0] ?? '#8B7355';
          const fillColor = applyTod(rawFill);

          // 3-face box
          const topFL = proj(fx - fw / 2, fy - fd / 2, fh);
          const topFR = proj(fx + fw / 2, fy - fd / 2, fh);
          const topBR = proj(fx + fw / 2, fy + fd / 2, fh);
          const topBL = proj(fx - fw / 2, fy + fd / 2, fh);
          const botBL = proj(fx - fw / 2, fy + fd / 2, 0);
          const botBR = proj(fx + fw / 2, fy + fd / 2, 0);
          const botFR = proj(fx + fw / 2, fy - fd / 2, 0);

          const topPts = [topFL, topFR, topBR, topBL].map(p => `${p.x},${p.y}`).join(' ');
          const leftPts = [topBL, topBR, botBR, botBL].map(p => `${p.x},${p.y}`).join(' ');
          const rightPts = [topFR, topBR, botBR, botFR].map(p => `${p.x},${p.y}`).join(' ');

          const topFaceColor = isBlueprint ? '#1A3A6B' : multiplyColor(fillColor, 1.0);
          const leftFaceColor = isBlueprint ? BP_WALL : multiplyColor(fillColor, 0.68);
          const rightFaceColor = isBlueprint ? '#0D1F3C' : multiplyColor(fillColor, 0.82);
          const strokeColor = isBlueprint ? BP_LINE : 'rgba(255,255,255,0.25)';

          const emojiCenter = {
            x: (topFL.x + topFR.x + topBR.x + topBL.x) / 4,
            y: (topFL.y + topFR.y + topBR.y + topBL.y) / 4,
          };
          const emojiFontSize = Math.max(8, Math.min(16, fw * scale * 0.45));

          return (
            <G key={item.id}>
              <Polygon points={leftPts} fill={leftFaceColor} stroke={strokeColor} strokeWidth={0.5} />
              <Polygon points={rightPts} fill={rightFaceColor} stroke={strokeColor} strokeWidth={0.5} />
              <Polygon points={topPts} fill={topFaceColor} stroke={strokeColor} strokeWidth={0.5} />
              {!isBlueprint && (
                <SvgText
                  x={emojiCenter.x}
                  y={emojiCenter.y + 4}
                  textAnchor="middle"
                  fontSize={emojiFontSize}
                >
                  {furniture.emoji}
                </SvgText>
              )}
              {isBlueprint && (
                <SvgText
                  x={emojiCenter.x}
                  y={emojiCenter.y + 3}
                  textAnchor="middle"
                  fontSize={7}
                  fill={BP_LINE}
                  opacity={0.7}
                >
                  {furniture.name.slice(0, 4).toUpperCase()}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* ── ROOM LABEL ── */}
        {!isBlueprint && (
          <SvgText
            x={offsetX}
            y={offsetY - wh * scale - 14}
            textAnchor="middle"
            fontSize={13}
            fontWeight="700"
            fill={COLORS.text}
            opacity={0.85}
          >
            {room.name}
          </SvgText>
        )}

        {/* Blueprint dimension annotations */}
        {isBlueprint && (
          <>
            <SvgText
              x={offsetX}
              y={offsetY - wh * scale - 18}
              textAnchor="middle"
              fontSize={11}
              fontWeight="700"
              fill={BP_LINE}
            >
              {room.name.toUpperCase()}
            </SvgText>
            <SvgText
              x={offsetX}
              y={offsetY - wh * scale - 6}
              textAnchor="middle"
              fontSize={8}
              fill={BP_LINE}
              opacity={0.7}
            >
              {Math.round(roomW / 100 * 10) / 10}m × {Math.round(roomD / 100 * 10) / 10}m
            </SvgText>
            {/* Wall dimension lines */}
            {(() => {
              const dimY = proj(minX + roomW / 2, maxY, 0);
              const dimX = proj(maxX, minY + roomD / 2, 0);
              return (
                <>
                  <SvgText x={dimY.x} y={dimY.y + 14} textAnchor="middle" fontSize={8} fill={BP_LINE} opacity={0.8}>
                    {Math.round(roomW / 10)}cm
                  </SvgText>
                  <SvgText x={dimX.x + 10} y={dimX.y} textAnchor="start" fontSize={8} fill={BP_LINE} opacity={0.8}>
                    {Math.round(roomD / 10)}cm
                  </SvgText>
                </>
              );
            })()}
            {/* Watermark */}
            <SvgText
              x={width - 12}
              y={height - 10}
              textAnchor="end"
              fontSize={8}
              fill={BP_LINE}
              opacity={0.3}
              fontWeight="700"
            >
              SPACECRAFT 3D
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
