import { Room, FloorPlan, FurnitureItem } from '@/types';
import { FURNITURE_CATALOG } from '@/data/furniture';

export interface Recommendation {
  item: FurnitureItem;
  score: number; // 0-100
  reason: string;
  placement: 'corner' | 'wall' | 'center' | 'window' | 'general';
  category: 'perfect' | 'style' | 'space' | 'popular' | 'budget';
}

const ROOM_TYPE_CATEGORIES: Record<string, string[]> = {
  living: ['seating', 'tables', 'storage', 'lighting', 'decor'],
  bedroom: ['beds', 'tables', 'storage', 'lighting', 'decor'],
  office: ['office', 'tables', 'seating', 'storage', 'lighting'],
  dining: ['tables', 'seating', 'storage', 'lighting'],
  kitchen: ['kitchen', 'tables', 'seating', 'storage'],
  bathroom: ['bathroom', 'storage', 'decor'],
  other: ['seating', 'tables', 'storage', 'decor'],
};

const ROOM_TYPE_PRIMARY: Record<string, string[]> = {
  living: ['seating', 'tables'],
  bedroom: ['beds', 'tables'],
  office: ['office', 'tables'],
  dining: ['tables', 'seating'],
  kitchen: ['kitchen'],
  bathroom: ['bathroom'],
  other: ['seating'],
};

function calcFloorCoverage(room: Room): number {
  const roomArea = (room.width / 100) * (room.height / 100); // m²
  let usedArea = 0;
  room.placedItems.forEach(pi => {
    const furniture = FURNITURE_CATALOG.find(f => f.id === pi.furnitureId);
    if (furniture) {
      usedArea += (furniture.width / 100) * (furniture.depth / 100) * (pi.scale ?? 1);
    }
  });
  return roomArea > 0 ? (usedArea / roomArea) * 100 : 0;
}

function getExistingCategories(room: Room): Set<string> {
  const cats = new Set<string>();
  room.placedItems.forEach(pi => {
    const f = FURNITURE_CATALOG.find(f => f.id === pi.furnitureId);
    if (f) cats.add(f.category);
  });
  return cats;
}

function getExistingStyles(room: Room): string[] {
  const styles: string[] = [];
  room.placedItems.forEach(pi => {
    const f = FURNITURE_CATALOG.find(f => f.id === pi.furnitureId);
    if (f) styles.push(...f.style);
  });
  return styles;
}

function generateReason(
  item: FurnitureItem,
  room: Room,
  project: FloorPlan,
  scoreBreakdown: { styleMatch: boolean; roomTypeMatch: boolean; sizeOk: boolean; gapFill: boolean }
): string {
  const roomAreaM2 = Math.round((room.width / 100) * (room.height / 100));
  const itemAreaM2 = ((item.width / 100) * (item.depth / 100)).toFixed(1);

  if (scoreBreakdown.gapFill) {
    if (item.category === 'lighting') return `Your ${room.name} has no lighting — this adds ambiance and function`;
    if (item.category === 'decor') return `Adds personality to your ${room.name} with minimal floor space (${itemAreaM2}m²)`;
    if (item.category === 'beds') return `Essential for your ${room.type} — fits within your ${roomAreaM2}m² layout`;
  }
  if (scoreBreakdown.styleMatch && scoreBreakdown.roomTypeMatch) {
    return `Perfect ${project.style} style match for your ${roomAreaM2}m² ${room.type} room`;
  }
  if (scoreBreakdown.styleMatch) {
    return `Complements your existing ${project.style} aesthetic beautifully`;
  }
  if (scoreBreakdown.sizeOk) {
    return `Ideal size (${item.width}×${item.depth}cm) for your ${roomAreaM2}m² room`;
  }
  if (item.popular) {
    return `Trending choice — used in thousands of similar ${room.type} rooms`;
  }
  return `Great addition to complete your ${room.name} design`;
}

function getPlacement(item: FurnitureItem, room: Room): Recommendation['placement'] {
  if (['storage', 'tv-unit', 'bookshelf'].some(t => item.subcategory.includes(t))) return 'wall';
  if (item.category === 'decor') return 'corner';
  if (item.category === 'lighting') return 'corner';
  if (['sofa', 'bed'].some(t => item.subcategory.includes(t))) return 'center';
  if (room.windows.length > 0 && item.category === 'seating') return 'window';
  return 'general';
}

export function generateRecommendations(room: Room, project: FloorPlan): Recommendation[] {
  const coverage = calcFloorCoverage(room);
  const existingCats = getExistingCategories(room);
  const existingStyles = getExistingStyles(room);
  const allowedCats = new Set(ROOM_TYPE_CATEGORIES[room.type] ?? ROOM_TYPE_CATEGORIES.other);
  const primaryCats = new Set(ROOM_TYPE_PRIMARY[room.type] ?? []);
  const existingItemIds = new Set(room.placedItems.map(pi => pi.furnitureId));

  const scored: Recommendation[] = [];

  for (const item of FURNITURE_CATALOG) {
    // Skip already placed items
    if (existingItemIds.has(item.id)) continue;
    // Skip items not relevant to room type
    if (!allowedCats.has(item.category)) continue;

    let score = 0;
    const breakdown = { styleMatch: false, roomTypeMatch: false, sizeOk: false, gapFill: false };

    // Style match: +30
    if (item.style.includes(project.style)) {
      score += 30;
      breakdown.styleMatch = true;
    }

    // Room type match: +25
    if (primaryCats.has(item.category)) {
      score += 25;
      breakdown.roomTypeMatch = true;
    }

    // Size appropriate: +20 (target 30-40% coverage, prefer smaller items if already crowded)
    const itemAreaM2 = (item.width / 100) * (item.depth / 100);
    const roomAreaM2 = (room.width / 100) * (room.height / 100);
    const itemCoverageContrib = roomAreaM2 > 0 ? (itemAreaM2 / roomAreaM2) * 100 : 0;
    if (coverage < 40 && itemCoverageContrib < 20) {
      score += 20;
      breakdown.sizeOk = true;
    } else if (coverage >= 40 && itemCoverageContrib < 5) {
      score += 15;
      breakdown.sizeOk = true;
    } else if (itemCoverageContrib < 10) {
      score += 10;
      breakdown.sizeOk = true;
    }

    // Category gap fill: +15
    if (!existingCats.has(item.category) && allowedCats.has(item.category)) {
      score += 15;
      breakdown.gapFill = true;
    }

    // Existing item harmony: boost if existing items share style
    const styleOverlap = item.style.filter(s => existingStyles.includes(s)).length;
    if (styleOverlap > 0) score += Math.min(styleOverlap * 3, 9);

    // Popular: +10
    if (item.popular) score += 10;

    // Cap at 100
    score = Math.min(score, 100);

    const reason = generateReason(item, room, project, breakdown);
    const placement = getPlacement(item, room);

    // Determine recommendation category
    let recCategory: Recommendation['category'];
    const price = item.price ?? 0;
    if (score >= 75) {
      recCategory = 'perfect';
    } else if (breakdown.styleMatch) {
      recCategory = 'style';
    } else if (breakdown.gapFill || breakdown.sizeOk) {
      recCategory = 'space';
    } else if (item.popular) {
      recCategory = 'popular';
    } else if (price > 0 && price < 200) {
      recCategory = 'budget';
    } else {
      recCategory = 'style';
    }

    scored.push({ item, score, reason, placement, category: recCategory });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

export function getPerfectMatches(recs: Recommendation[]): Recommendation[] {
  return recs.filter(r => r.category === 'perfect').slice(0, 3);
}

export function getStyleMatches(recs: Recommendation[]): Recommendation[] {
  return recs.filter(r => r.category === 'style').slice(0, 6);
}

export function getSpaceFills(recs: Recommendation[]): Recommendation[] {
  return recs.filter(r => r.category === 'space').slice(0, 4);
}

export function getPopularPicks(recs: Recommendation[]): Recommendation[] {
  return recs.filter(r => r.item.popular).slice(0, 6);
}

export function getBudgetPicks(recs: Recommendation[]): Recommendation[] {
  return recs.filter(r => (r.item.price ?? Infinity) < 200).slice(0, 6);
}

export function getRoomAreaM2(room: Room): number {
  return Math.round((room.width / 100) * (room.height / 100));
}

export function getFloorCoveragePercent(room: Room): number {
  return Math.round(calcFloorCoverage(room));
}
