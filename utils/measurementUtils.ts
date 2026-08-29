import { Room } from '@/types';

// 1 canvas unit = 1 cm
const CM2_PER_M2 = 10000;
const CM_PER_FOOT = 30.48;
const CM2_PER_SQFT = CM_PER_FOOT * CM_PER_FOOT;

export function calculateRoomArea(room: Room): number {
  // Use room.width × room.height bounding box (canvas units = cm)
  // Subtract wall thickness from each side (approximate)
  const wallThickness = room.walls.length > 0 ? (room.walls[0]?.thickness ?? 10) : 10;
  const innerW = Math.max(0, room.width - wallThickness * 2);
  const innerH = Math.max(0, room.height - wallThickness * 2);
  return innerW * innerH; // cm²
}

export function calculateRoomAreaM2(room: Room): number {
  return calculateRoomArea(room) / CM2_PER_M2;
}

export function calculateRoomAreaSqFt(room: Room): number {
  return calculateRoomArea(room) / CM2_PER_SQFT;
}

export function calculatePerimeter(room: Room): number {
  // Sum of all wall lengths in cm
  if (room.walls.length === 0) {
    const wallThickness = 10;
    const innerW = Math.max(0, room.width - wallThickness * 2);
    const innerH = Math.max(0, room.height - wallThickness * 2);
    return 2 * (innerW + innerH);
  }
  return room.walls.reduce((sum, wall) => {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);
}

export function calculateWallArea(room: Room, ceilingHeight: number): number {
  // Total wall surface area in cm²
  const perimeter = calculatePerimeter(room);
  return perimeter * ceilingHeight;
}

export function calculateNetWallArea(room: Room, ceilingHeight: number): number {
  const totalWallArea = calculateWallArea(room, ceilingHeight);

  // Subtract door openings (each door: width × ceilingHeight)
  const doorArea = room.doors.reduce((sum, door) => {
    return sum + door.width * ceilingHeight;
  }, 0);

  // Subtract window openings (each window: width × 100cm standard height)
  const windowHeight = 100; // standard window height in cm
  const windowArea = room.windows.reduce((sum, win) => {
    return sum + win.width * windowHeight;
  }, 0);

  return Math.max(0, totalWallArea - doorArea - windowArea);
}

export function calculateFurnitureCoverage(room: Room): number {
  // Sum footprint of all placed items using FURNITURE_CATALOG dimensions
  // We use a lazy import to avoid circular deps — caller should pass catalog
  // For now, return 0 and let the screen compute it with catalog access
  return 0;
}

export function calculateFurnitureCoverageWithCatalog(
  room: Room,
  catalog: { id: string; width: number; depth: number }[]
): number {
  const floorArea = calculateRoomArea(room);
  if (floorArea === 0) return 0;

  const furnitureArea = room.placedItems.reduce((sum, item) => {
    const furniture = catalog.find(f => f.id === item.furnitureId);
    if (!furniture) return sum;
    const scale = item.scale ?? 1;
    return sum + furniture.width * scale * furniture.depth * scale;
  }, 0);

  return Math.min(100, (furnitureArea / floorArea) * 100);
}

export function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  if (inches === 12) {
    return `${feet + 1}'0"`;
  }
  return `${feet}'${inches}"`;
}

export function formatArea(cm2: number): string {
  const m2 = cm2 / CM2_PER_M2;
  return `${m2.toFixed(1)} m²`;
}

export function formatAreaSqFt(cm2: number): string {
  const sqft = cm2 / CM2_PER_SQFT;
  return `${sqft.toFixed(1)} sq ft`;
}

export function formatLength(cm: number, unit: 'cm' | 'ft'): string {
  if (unit === 'ft') {
    return cmToFtIn(cm);
  }
  return `${Math.round(cm)} cm`;
}

export function getWallLabel(index: number): string {
  const labels = ['North', 'East', 'South', 'West'];
  return labels[index % 4] ?? `Wall ${index + 1}`;
}

export function getWallLength(wall: { x1: number; y1: number; x2: number; y2: number }): number {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return Math.sqrt(dx * dx + dy * dy);
}
