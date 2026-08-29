export type RoomShape = 'rectangle' | 'L-shape' | 'custom';

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

export interface Door {
  id: string;
  wallId: string;
  position: number;
  width: number;
  direction: 'left' | 'right';
}

export interface Window {
  id: string;
  wallId: string;
  position: number;
  width: number;
}

export interface PlacedItem {
  id: string;
  furnitureId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color?: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'dining' | 'other';
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  placedItems: PlacedItem[];
  floorColor: string;
  wallColor: string;
  width: number;
  height: number;
}

export interface FloorPlan {
  id: string;
  name: string;
  thumbnail?: string;
  rooms: Room[];
  totalArea: number;
  createdAt: string;
  updatedAt: string;
  style: 'modern' | 'scandinavian' | 'industrial' | 'bohemian' | 'minimalist' | 'classic';
}

export type FurnitureCategory =
  | 'seating'
  | 'tables'
  | 'storage'
  | 'beds'
  | 'lighting'
  | 'decor'
  | 'kitchen'
  | 'bathroom'
  | 'office'
  | 'outdoor';

export interface FurnitureItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  subcategory: string;
  width: number;
  depth: number;
  height: number;
  emoji: string;
  colors: string[];
  style: string[];
  tags: string[];
  popular: boolean;
}
