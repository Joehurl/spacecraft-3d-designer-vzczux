import { Room, PlacedItem, Wall, FloorPlan } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';

export interface GeneratedRoom {
  project: Omit<FloorPlan, 'id' | 'createdAt' | 'updatedAt'>;
  itemCount: number;
  summary: string;
  roomName: string;
}

type RoomType = Room['type'];

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

interface RoomConfig {
  type: RoomType;
  name: string;
  width: number;
  height: number;
  floorColor: string;
  wallColor: string;
}

const ROOM_CONFIGS: Record<RoomType, RoomConfig> = {
  bedroom: { type: 'bedroom', name: 'Bedroom', width: 420, height: 360, floorColor: '#D4C5B0', wallColor: '#F0EDE8' },
  living: { type: 'living', name: 'Living Room', width: 600, height: 450, floorColor: '#E8E0D0', wallColor: '#F5F5F0' },
  office: { type: 'office', name: 'Home Office', width: 400, height: 350, floorColor: '#D8D0C8', wallColor: '#EEEAE6' },
  kitchen: { type: 'kitchen', name: 'Kitchen', width: 380, height: 320, floorColor: '#E0E0E0', wallColor: '#F5F5F5' },
  dining: { type: 'dining', name: 'Dining Room', width: 450, height: 380, floorColor: '#D8C8B8', wallColor: '#F0EAE0' },
  bathroom: { type: 'bathroom', name: 'Bathroom', width: 280, height: 240, floorColor: '#E8E8E8', wallColor: '#F8F8F8' },
  other: { type: 'other', name: 'Room', width: 450, height: 380, floorColor: '#E8E0D0', wallColor: '#F5F5F0' },
};

const STYLE_COLORS: Record<FloorPlan['style'], { floor: string; wall: string }> = {
  modern: { floor: '#C8C0B8', wall: '#EEEAE6' },
  scandinavian: { floor: '#D4C5A8', wall: '#F5F0E8' },
  industrial: { floor: '#B8B0A8', wall: '#D8D0C8' },
  bohemian: { floor: '#C8A878', wall: '#F0E8D8' },
  minimalist: { floor: '#D8D8D8', wall: '#F5F5F5' },
  classic: { floor: '#C8B898', wall: '#F0E8DC' },
};

function detectRoomType(prompt: string): RoomType {
  const lower = prompt.toLowerCase();
  if (/bedroom|bed\b|sleep|nightstand|wardrobe|duvet|pillow/.test(lower)) return 'bedroom';
  if (/living|sofa|couch|tv\b|television|lounge|sectional/.test(lower)) return 'living';
  if (/office|desk|work\b|study|computer|monitor|standing desk/.test(lower)) return 'office';
  if (/kitchen|cook|oven|fridge|refrigerator|counter/.test(lower)) return 'kitchen';
  if (/dining|dinner|eat\b|table and chair|dining table/.test(lower)) return 'dining';
  if (/bathroom|bath\b|shower|toilet|sink/.test(lower)) return 'bathroom';
  // fallback: check for furniture keywords
  if (/sofa|armchair|coffee table|rug/.test(lower)) return 'living';
  if (/bed\b|mattress/.test(lower)) return 'bedroom';
  return 'living';
}

function selectFurnitureIds(prompt: string, roomType: RoomType, style: FloorPlan['style']): string[] {
  const lower = prompt.toLowerCase();
  const ids: string[] = [];

  const addIfExists = (id: string) => {
    if (FURNITURE_CATALOG.find(f => f.id === id)) ids.push(id);
  };

  // Base furniture by room type
  switch (roomType) {
    case 'bedroom':
      // Detect bed size
      if (/king/.test(lower)) addIfExists('bed-001');
      else if (/twin|single/.test(lower)) addIfExists('bed-003');
      else addIfExists('bed-002'); // queen default
      addIfExists('nightstand-001');
      addIfExists('nightstand-001'); // two nightstands
      if (/wardrobe|closet/.test(lower)) addIfExists('wardrobe-001');
      else addIfExists('dresser-001');
      addIfExists('lamp-006');
      if (/reading|nook|corner/.test(lower)) {
        addIfExists('chair-001');
        addIfExists('lamp-001');
        addIfExists('side-001');
      }
      if (/mirror/.test(lower)) addIfExists('mirror-001');
      if (/plant/.test(lower)) addIfExists('plant-006');
      break;

    case 'living':
      if (/sectional/.test(lower)) addIfExists('sofa-001');
      else addIfExists('sofa-003');
      addIfExists('coffee-001');
      addIfExists('tv-unit-001');
      if (/armchair|chair/.test(lower)) addIfExists('chair-001');
      addIfExists('plant-001');
      addIfExists('rug-001');
      if (/lamp/.test(lower)) addIfExists('lamp-001');
      if (/bookshelf|books/.test(lower)) addIfExists('bookshelf-001');
      if (/side table/.test(lower)) addIfExists('side-001');
      break;

    case 'office':
      if (/standing desk/.test(lower)) addIfExists('desk-003');
      else if (/l.shape|corner desk/.test(lower)) addIfExists('desk-002');
      else addIfExists('desk-001');
      addIfExists('officechair-001');
      addIfExists('bookshelf-001');
      addIfExists('lamp-004');
      addIfExists('plant-006');
      if (/filing|cabinet/.test(lower)) addIfExists('cabinet-004');
      if (/sofa|couch/.test(lower)) addIfExists('sofa-002');
      break;

    case 'kitchen':
      addIfExists('kitchen-001'); // island
      addIfExists('kitchen-002'); // fridge
      addIfExists('kitchen-003'); // oven
      addIfExists('kitchen-008'); // sink
      addIfExists('dining-002'); // 4-person table
      addIfExists('diningchair-001');
      addIfExists('diningchair-001');
      addIfExists('diningchair-001');
      addIfExists('diningchair-001');
      break;

    case 'dining':
      if (/6.person|six/.test(lower)) addIfExists('dining-001');
      else addIfExists('dining-002');
      addIfExists('diningchair-001');
      addIfExists('diningchair-001');
      addIfExists('diningchair-001');
      addIfExists('diningchair-001');
      addIfExists('sideboard-001');
      if (/chandelier|pendant/.test(lower)) addIfExists('chandelier-001');
      else addIfExists('pendant-002');
      break;

    case 'bathroom':
      addIfExists('mirror-002');
      break;

    default:
      addIfExists('sofa-003');
      addIfExists('coffee-001');
      addIfExists('plant-001');
  }

  // Style-based additions
  if (/scandinavian|hygge|cozy/.test(lower)) {
    if (!ids.includes('plant-004')) addIfExists('plant-004');
    if (!ids.includes('throw-001')) addIfExists('throw-001');
  }
  if (/bohemian|boho/.test(lower)) {
    if (!ids.includes('rug-001')) addIfExists('rug-001');
    if (!ids.includes('plant-002')) addIfExists('plant-002');
  }
  if (/industrial/.test(lower)) {
    if (!ids.includes('lamp-002')) addIfExists('lamp-002');
  }
  if (/plant|green|nature/.test(lower)) {
    if (!ids.includes('plant-001')) addIfExists('plant-001');
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }

  return unique.slice(0, 10);
}

function buildWalls(width: number, height: number): Wall[] {
  return [
    { id: generateId(), x1: 50, y1: 50, x2: width - 50, y2: 50, thickness: 10 },
    { id: generateId(), x1: width - 50, y1: 50, x2: width - 50, y2: height - 50, thickness: 10 },
    { id: generateId(), x1: width - 50, y1: height - 50, x2: 50, y2: height - 50, thickness: 10 },
    { id: generateId(), x1: 50, y1: height - 50, x2: 50, y2: 50, thickness: 10 },
  ];
}

function placeFurniture(furnitureIds: string[], roomWidth: number, roomHeight: number): PlacedItem[] {
  const MARGIN = 60;
  const placed: PlacedItem[] = [];
  const usedRects: { x: number; y: number; w: number; h: number }[] = [];

  function overlaps(x: number, y: number, w: number, h: number): boolean {
    for (const r of usedRects) {
      const overlapX = x < r.x + r.w + 10 && x + w + 10 > r.x;
      const overlapY = y < r.y + r.h + 10 && y + h + 10 > r.y;
      if (overlapX && overlapY) return true;
    }
    return false;
  }

  // Predefined placement zones for common furniture
  const zones: { x: number; y: number }[] = [
    { x: MARGIN, y: MARGIN },
    { x: roomWidth / 2 - 60, y: MARGIN },
    { x: roomWidth - MARGIN - 120, y: MARGIN },
    { x: MARGIN, y: roomHeight / 2 - 60 },
    { x: roomWidth / 2 - 60, y: roomHeight / 2 - 60 },
    { x: roomWidth - MARGIN - 120, y: roomHeight / 2 - 60 },
    { x: MARGIN, y: roomHeight - MARGIN - 120 },
    { x: roomWidth / 2 - 60, y: roomHeight - MARGIN - 120 },
    { x: roomWidth - MARGIN - 120, y: roomHeight - MARGIN - 120 },
    { x: MARGIN + 60, y: MARGIN + 60 },
  ];

  furnitureIds.forEach((fid, index) => {
    const item = FURNITURE_CATALOG.find(f => f.id === fid);
    if (!item) return;

    const w = item.width / 4; // scale down for canvas
    const h = item.depth / 4;

    // Try zones first, then random fallback
    let placed_x = MARGIN;
    let placed_y = MARGIN;
    let found = false;

    for (const zone of zones) {
      const cx = Math.min(zone.x, roomWidth - MARGIN - w);
      const cy = Math.min(zone.y, roomHeight - MARGIN - h);
      if (cx >= MARGIN && cy >= MARGIN && !overlaps(cx, cy, w, h)) {
        placed_x = cx;
        placed_y = cy;
        found = true;
        break;
      }
    }

    if (!found) {
      // Random placement within bounds
      for (let attempt = 0; attempt < 20; attempt++) {
        const rx = MARGIN + Math.random() * (roomWidth - 2 * MARGIN - w);
        const ry = MARGIN + Math.random() * (roomHeight - 2 * MARGIN - h);
        if (!overlaps(rx, ry, w, h)) {
          placed_x = rx;
          placed_y = ry;
          found = true;
          break;
        }
      }
    }

    usedRects.push({ x: placed_x, y: placed_y, w, h });
    placed.push({
      id: generateId(),
      furnitureId: fid,
      x: Math.round(placed_x),
      y: Math.round(placed_y),
      rotation: 0,
      scale: 1,
      color: item.colors[0],
    });
  });

  return placed;
}

export function generateRoomFromPrompt(prompt: string, style: FloorPlan['style']): GeneratedRoom {
  console.log('[AIRoomGenerator] Generating room from prompt:', prompt, 'style:', style);

  const roomType = detectRoomType(prompt);
  const config = ROOM_CONFIGS[roomType];
  const styleColors = STYLE_COLORS[style];

  const furnitureIds = selectFurnitureIds(prompt, roomType, style);
  const walls = buildWalls(config.width, config.height);
  const placedItems = placeFurniture(furnitureIds, config.width, config.height);

  const styleLabel = style.charAt(0).toUpperCase() + style.slice(1);
  const roomName = config.name;
  const summary = `${roomName} · ${placedItems.length} items · ${styleLabel} style`;

  const room: Room = {
    id: generateId(),
    name: roomName,
    type: roomType,
    walls,
    doors: [
      {
        id: generateId(),
        wallId: walls[2].id,
        position: 0.5,
        width: 80,
        direction: 'left',
      },
    ],
    windows: [
      {
        id: generateId(),
        wallId: walls[0].id,
        position: 0.4,
        width: 100,
      },
      {
        id: generateId(),
        wallId: walls[0].id,
        position: 0.7,
        width: 100,
      },
    ],
    placedItems,
    floorColor: styleColors.floor,
    wallColor: styleColors.wall,
    width: config.width,
    height: config.height,
  };

  const projectName = `AI ${styleLabel} ${roomName}`;

  const project: Omit<FloorPlan, 'id' | 'createdAt' | 'updatedAt'> = {
    name: projectName,
    style,
    rooms: [room],
    totalArea: Math.round((config.width * config.height) / 10000),
  };

  console.log('[AIRoomGenerator] Generated project:', projectName, 'with', placedItems.length, 'items');

  return {
    project,
    itemCount: placedItems.length,
    summary,
    roomName,
  };
}
