import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  PanResponder,
  Animated,
  StyleSheet,
  Text,
  Dimensions,
} from 'react-native';
import Svg, {
  Line,
  Rect,
  Circle,
  Path,
  G,
  Text as SvgText,
  Defs,
  Pattern,
} from 'react-native-svg';
import { COLORS } from '@/constants/Colors';
import { Room, Wall, PlacedItem } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';

export type EditorTool = 'select' | 'wall' | 'door' | 'window' | 'furniture' | 'measure' | 'eraser';

interface FloorPlanCanvasProps {
  room: Room;
  activeTool: EditorTool;
  onAddWall: (wall: Omit<Wall, 'id'>) => void;
  onUpdatePlacedItem: (itemId: string, updates: Partial<PlacedItem>) => void;
  onRemovePlacedItem: (itemId: string) => void;
  onSelectItem: (itemId: string | null) => void;
  selectedItemId: string | null;
  onOpenFurniturePicker: () => void;
}

const GRID_SIZE = 20;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export function FloorPlanCanvas({
  room,
  activeTool,
  onAddWall,
  onUpdatePlacedItem,
  onRemovePlacedItem,
  onSelectItem,
  selectedItemId,
  onOpenFurniturePicker,
}: FloorPlanCanvasProps) {
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [previewEnd, setPreviewEnd] = useState<{ x: number; y: number } | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const lastPan = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const canvasRef = useRef<View>(null);

  const toCanvas = useCallback((screenX: number, screenY: number) => ({
    x: (screenX - viewOffset.x) / scale,
    y: (screenY - viewOffset.y) / scale,
  }), [viewOffset, scale]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 1) {
          lastPan.current = { x: touches[0].pageX, y: touches[0].pageY };
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // Pinch zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (lastPinchDist.current !== null) {
            const delta = dist / lastPinchDist.current;
            setScale(s => Math.max(0.3, Math.min(3, s * delta)));
          }
          lastPinchDist.current = dist;
          return;
        }

        lastPinchDist.current = null;

        if (touches.length === 1) {
          const tx = touches[0].pageX;
          const ty = touches[0].pageY;

          if (activeTool === 'select' && draggingItemId) {
            const canvasPos = {
              x: (tx - viewOffset.x) / scale - dragOffset.x,
              y: (ty - viewOffset.y) / scale - dragOffset.y,
            };
            onUpdatePlacedItem(draggingItemId, {
              x: snapToGrid(canvasPos.x),
              y: snapToGrid(canvasPos.y),
            });
          } else if (activeTool === 'select') {
            // Pan
            const dx = tx - lastPan.current.x;
            const dy = ty - lastPan.current.y;
            setViewOffset(v => ({ x: v.x + dx, y: v.y + dy }));
            lastPan.current = { x: tx, y: ty };
          } else if (activeTool === 'wall' && wallStart) {
            const canvasPos = toCanvas(tx, ty);
            setPreviewEnd({ x: snapToGrid(canvasPos.x), y: snapToGrid(canvasPos.y) });
          }
        }
      },

      onPanResponderRelease: (evt) => {
        lastPinchDist.current = null;
        setDraggingItemId(null);

        const touches = evt.nativeEvent.changedTouches;
        if (touches.length === 0) return;
        const tx = touches[0].pageX;
        const ty = touches[0].pageY;
        const canvasPos = toCanvas(tx, ty);
        const snapped = { x: snapToGrid(canvasPos.x), y: snapToGrid(canvasPos.y) };

        if (activeTool === 'wall') {
          if (!wallStart) {
            console.log('[Canvas] Wall start point placed at', snapped);
            setWallStart(snapped);
            setPreviewEnd(snapped);
          } else {
            if (Math.abs(snapped.x - wallStart.x) > 5 || Math.abs(snapped.y - wallStart.y) > 5) {
              console.log('[Canvas] Wall drawn from', wallStart, 'to', snapped);
              onAddWall({ x1: wallStart.x, y1: wallStart.y, x2: snapped.x, y2: snapped.y, thickness: 10 });
            }
            setWallStart(null);
            setPreviewEnd(null);
          }
        } else if (activeTool === 'select') {
          // Check if tapped on a furniture item
          let tappedId: string | null = null;
          for (const item of room.placedItems) {
            const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
            if (!furniture) continue;
            const hw = furniture.width / 2;
            const hd = furniture.depth / 2;
            if (
              canvasPos.x >= item.x - hw &&
              canvasPos.x <= item.x + hw &&
              canvasPos.y >= item.y - hd &&
              canvasPos.y <= item.y + hd
            ) {
              tappedId = item.id;
              break;
            }
          }
          console.log('[Canvas] Tap select:', tappedId ?? 'none');
          onSelectItem(tappedId);
        } else if (activeTool === 'eraser' && selectedItemId) {
          console.log('[Canvas] Eraser: remove item', selectedItemId);
          onRemovePlacedItem(selectedItemId);
          onSelectItem(null);
        } else if (activeTool === 'furniture') {
          console.log('[Canvas] Open furniture picker');
          onOpenFurniturePicker();
        }
      },
    })
  ).current;

  const handleItemPressIn = useCallback((item: PlacedItem, touchX: number, touchY: number) => {
    if (activeTool !== 'select') return;
    const canvasPos = toCanvas(touchX, touchY);
    setDraggingItemId(item.id);
    setDragOffset({ x: canvasPos.x - item.x, y: canvasPos.y - item.y });
    onSelectItem(item.id);
  }, [activeTool, toCanvas, onSelectItem]);

  const canvasWidth = SCREEN_W;
  const canvasHeight = SCREEN_H - 200;

  // Calculate room bounds for floor fill
  const allX = room.walls.flatMap(w => [w.x1, w.x2]);
  const allY = room.walls.flatMap(w => [w.y1, w.y2]);
  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 400;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) : 300;

  return (
    <View style={styles.container} ref={canvasRef} {...panResponder.panHandlers}>
      <Svg
        width={canvasWidth}
        height={canvasHeight}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <Pattern id="grid" x={viewOffset.x % (GRID_SIZE * scale)} y={viewOffset.y % (GRID_SIZE * scale)} width={GRID_SIZE * scale} height={GRID_SIZE * scale} patternUnits="userSpaceOnUse">
            <Circle cx={0} cy={0} r={1} fill={COLORS.textTertiary} opacity={0.3} />
          </Pattern>
        </Defs>

        {/* Grid */}
        <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="url(#grid)" />

        {/* Floor fill */}
        {room.walls.length >= 4 && (
          <Rect
            x={minX * scale + viewOffset.x}
            y={minY * scale + viewOffset.y}
            width={(maxX - minX) * scale}
            height={(maxY - minY) * scale}
            fill={room.floorColor}
            opacity={0.35}
          />
        )}

        {/* Placed furniture */}
        {room.placedItems.map(item => {
          const furniture = FURNITURE_CATALOG.find(f => f.id === item.furnitureId);
          if (!furniture) return null;
          const iw = furniture.width * scale;
          const id = furniture.depth * scale;
          const sx = item.x * scale + viewOffset.x;
          const sy = item.y * scale + viewOffset.y;
          const isSelected = selectedItemId === item.id;
          const fillColor = item.color ?? furniture.colors[0] ?? '#8B7355';

          return (
            <G
              key={item.id}
              rotation={item.rotation}
              origin={`${sx}, ${sy}`}
              onStartShouldSetResponder={() => true}
            >
              <Rect
                x={sx - iw / 2}
                y={sy - id / 2}
                width={iw}
                height={id}
                fill={fillColor}
                opacity={0.85}
                rx={4}
                stroke={isSelected ? COLORS.primary : 'rgba(255,255,255,0.2)'}
                strokeWidth={isSelected ? 2 : 1}
                strokeDasharray={isSelected ? '6,3' : undefined}
              />
              <SvgText
                x={sx}
                y={sy + 5}
                textAnchor="middle"
                fontSize={Math.max(10, Math.min(24, iw * 0.35))}
              >
                {furniture.emoji}
              </SvgText>
              {isSelected && (
                <>
                  <Circle cx={sx - iw / 2} cy={sy - id / 2} r={5} fill={COLORS.primary} />
                  <Circle cx={sx + iw / 2} cy={sy - id / 2} r={5} fill={COLORS.primary} />
                  <Circle cx={sx - iw / 2} cy={sy + id / 2} r={5} fill={COLORS.primary} />
                  <Circle cx={sx + iw / 2} cy={sy + id / 2} r={5} fill={COLORS.primary} />
                </>
              )}
            </G>
          );
        })}

        {/* Walls */}
        {room.walls.map(wall => {
          const x1 = wall.x1 * scale + viewOffset.x;
          const y1 = wall.y1 * scale + viewOffset.y;
          const x2 = wall.x2 * scale + viewOffset.x;
          const y2 = wall.y2 * scale + viewOffset.y;
          const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const lenCm = Math.round(Math.sqrt((wall.x2 - wall.x1) ** 2 + (wall.y2 - wall.y1) ** 2));

          return (
            <G key={wall.id}>
              <Line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={COLORS.text}
                strokeWidth={wall.thickness * scale * 0.5}
                strokeLinecap="round"
              />
              {len > 60 && (
                <SvgText
                  x={midX}
                  y={midY - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill={COLORS.textSecondary}
                >
                  {lenCm}cm
                </SvgText>
              )}
            </G>
          );
        })}

        {/* Doors */}
        {room.doors.map(door => {
          const wall = room.walls.find(w => w.id === door.wallId);
          if (!wall) return null;
          const dx = wall.x2 - wall.x1;
          const dy = wall.y2 - wall.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const px = (wall.x1 + dx * door.position) * scale + viewOffset.x;
          const py = (wall.y1 + dy * door.position) * scale + viewOffset.y;
          const doorW = door.width * scale;
          const ux = dx / len;
          const uy = dy / len;
          const ex = px + ux * doorW;
          const ey = py + uy * doorW;
          const nx = -uy;
          const ny = ux;
          const sweep = door.direction === 'right' ? 1 : 0;

          return (
            <G key={door.id}>
              <Line x1={px} y1={py} x2={ex} y2={ey} stroke={COLORS.background} strokeWidth={door.width * scale * 0.5} />
              <Path
                d={`M ${px} ${py} A ${doorW} ${doorW} 0 0 ${sweep} ${px + nx * doorW} ${py + ny * doorW}`}
                stroke={COLORS.accent}
                strokeWidth={1.5}
                fill="none"
                strokeDasharray="4,3"
              />
            </G>
          );
        })}

        {/* Windows */}
        {room.windows.map(win => {
          const wall = room.walls.find(w => w.id === win.wallId);
          if (!wall) return null;
          const dx = wall.x2 - wall.x1;
          const dy = wall.y2 - wall.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const px = (wall.x1 + dx * win.position) * scale + viewOffset.x;
          const py = (wall.y1 + dy * win.position) * scale + viewOffset.y;
          const winW = win.width * scale;
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy * 6;
          const ny = ux * 6;

          return (
            <G key={win.id}>
              <Line
                x1={px - ux * winW / 2} y1={py - uy * winW / 2}
                x2={px + ux * winW / 2} y2={py + uy * winW / 2}
                stroke="#60A5FA"
                strokeWidth={6}
              />
              <Line
                x1={px - ux * winW / 2 + nx} y1={py - uy * winW / 2 + ny}
                x2={px + ux * winW / 2 + nx} y2={py + uy * winW / 2 + ny}
                stroke="#60A5FA"
                strokeWidth={2}
                strokeDasharray="4,3"
              />
            </G>
          );
        })}

        {/* Wall start point indicator */}
        {wallStart && (
          <Circle
            cx={wallStart.x * scale + viewOffset.x}
            cy={wallStart.y * scale + viewOffset.y}
            r={6}
            fill={COLORS.primary}
            opacity={0.9}
          />
        )}

        {/* Wall preview line */}
        {wallStart && previewEnd && (
          <Line
            x1={wallStart.x * scale + viewOffset.x}
            y1={wallStart.y * scale + viewOffset.y}
            x2={previewEnd.x * scale + viewOffset.x}
            y2={previewEnd.y * scale + viewOffset.y}
            stroke={COLORS.primary}
            strokeWidth={3}
            strokeDasharray="8,4"
            opacity={0.7}
          />
        )}
      </Svg>

      {/* Scale indicator */}
      <View style={styles.scaleIndicator}>
        <Text style={styles.scaleText}>1 sq = 20cm</Text>
      </View>

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <View
          style={styles.zoomBtn}
          onTouchEnd={() => {
            console.log('[Canvas] Zoom in');
            setScale(s => Math.min(3, s * 1.2));
          }}
        >
          <Text style={styles.zoomText}>+</Text>
        </View>
        <View
          style={styles.zoomBtn}
          onTouchEnd={() => {
            console.log('[Canvas] Zoom out');
            setScale(s => Math.max(0.3, s / 1.2));
          }}
        >
          <Text style={styles.zoomText}>−</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  scaleIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(19,25,41,0.85)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scaleText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 8,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 24,
  },
});
