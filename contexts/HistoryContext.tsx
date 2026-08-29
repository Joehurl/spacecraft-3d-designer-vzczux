import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Room } from '@/types';

const STORAGE_KEY = '@spacecraft3d_history';
const MAX_SNAPSHOTS_PER_PROJECT = 20;

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  version: number;
  timestamp: string;
  rooms: Room[];
  changeDescription: string;
  itemCount: number;
  wallCount: number;
}

interface HistoryContextType {
  snapshots: ProjectSnapshot[];
  getSnapshotsForProject: (projectId: string) => ProjectSnapshot[];
  saveSnapshot: (projectId: string, rooms: Room[], changeDescription: string) => void;
  restoreSnapshot: (projectId: string, snapshotId: string) => Room[] | null;
  clearHistory: (projectId: string) => void;
}

interface State {
  snapshots: ProjectSnapshot[];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; snapshots: ProjectSnapshot[] }
  | { type: 'SAVE_SNAPSHOT'; snapshot: ProjectSnapshot }
  | { type: 'CLEAR_HISTORY'; projectId: string };

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function countItems(rooms: Room[]): number {
  return rooms.reduce((sum, r) => sum + r.placedItems.length, 0);
}

function countWalls(rooms: Room[]): number {
  return rooms.reduce((sum, r) => sum + r.walls.length, 0);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { ...state, snapshots: action.snapshots, loaded: true };

    case 'SAVE_SNAPSHOT': {
      const projectSnaps = state.snapshots.filter(s => s.projectId === action.snapshot.projectId);
      const otherSnaps = state.snapshots.filter(s => s.projectId !== action.snapshot.projectId);
      const updated = [...projectSnaps, action.snapshot];
      const trimmed = updated.length > MAX_SNAPSHOTS_PER_PROJECT
        ? updated.slice(updated.length - MAX_SNAPSHOTS_PER_PROJECT)
        : updated;
      return { ...state, snapshots: [...otherSnaps, ...trimmed] };
    }

    case 'CLEAR_HISTORY': {
      return { ...state, snapshots: state.snapshots.filter(s => s.projectId !== action.projectId) };
    }

    default:
      return state;
  }
}

// ─── Mock seed snapshots ──────────────────────────────────────────────────────
function buildMockSnapshots(): ProjectSnapshot[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const baseRooms001: Room[] = [
    {
      id: 'room-001',
      name: 'Living / Bedroom',
      type: 'living',
      floorColor: '#E8E0D0',
      wallColor: '#F5F5F0',
      width: 600,
      height: 450,
      walls: [
        { id: 'w1', x1: 50, y1: 50, x2: 550, y2: 50, thickness: 10 },
        { id: 'w2', x1: 550, y1: 50, x2: 550, y2: 400, thickness: 10 },
        { id: 'w3', x1: 550, y1: 400, x2: 50, y2: 400, thickness: 10 },
        { id: 'w4', x1: 50, y1: 400, x2: 50, y2: 50, thickness: 10 },
      ],
      doors: [{ id: 'd1', wallId: 'w4', position: 0.7, width: 80, direction: 'right' }],
      windows: [{ id: 'win1', wallId: 'w1', position: 0.3, width: 100 }],
      placedItems: [
        { id: 'pi1', furnitureId: 'sofa-001', x: 120, y: 200, rotation: 0, scale: 1, color: '#4A4A4A' },
        { id: 'pi2', furnitureId: 'coffee-001', x: 200, y: 280, rotation: 0, scale: 1 },
      ],
    },
  ];

  const baseRooms002: Room[] = [
    {
      id: 'room-002',
      name: 'Bedroom',
      type: 'bedroom',
      floorColor: '#D4C5B0',
      wallColor: '#F0EDE8',
      width: 420,
      height: 360,
      walls: [
        { id: 'w5', x1: 60, y1: 60, x2: 380, y2: 60, thickness: 10 },
        { id: 'w6', x1: 380, y1: 60, x2: 380, y2: 320, thickness: 10 },
        { id: 'w7', x1: 380, y1: 320, x2: 60, y2: 320, thickness: 10 },
        { id: 'w8', x1: 60, y1: 320, x2: 60, y2: 60, thickness: 10 },
      ],
      doors: [{ id: 'd2', wallId: 'w7', position: 0.5, width: 80, direction: 'left' }],
      windows: [{ id: 'win3', wallId: 'w5', position: 0.5, width: 120 }],
      placedItems: [
        { id: 'pi6', furnitureId: 'bed-002', x: 150, y: 100, rotation: 0, scale: 1, color: '#F5F5DC' },
        { id: 'pi7', furnitureId: 'nightstand-001', x: 80, y: 120, rotation: 0, scale: 1 },
      ],
    },
  ];

  return [
    // sample-001 snapshots
    {
      id: generateId(),
      projectId: 'sample-001',
      version: 1,
      timestamp: new Date(now - 5 * day).toISOString(),
      rooms: [{ ...baseRooms001[0], placedItems: [], walls: baseRooms001[0].walls.slice(0, 2) }],
      changeDescription: 'Created project',
      itemCount: 0,
      wallCount: 2,
    },
    {
      id: generateId(),
      projectId: 'sample-001',
      version: 2,
      timestamp: new Date(now - 4 * day).toISOString(),
      rooms: [{ ...baseRooms001[0], placedItems: [], walls: baseRooms001[0].walls }],
      changeDescription: 'Drew 2 more walls',
      itemCount: 0,
      wallCount: 4,
    },
    {
      id: generateId(),
      projectId: 'sample-001',
      version: 3,
      timestamp: new Date(now - 3 * day).toISOString(),
      rooms: [{ ...baseRooms001[0], placedItems: [baseRooms001[0].placedItems[0]] }],
      changeDescription: 'Added sofa',
      itemCount: 1,
      wallCount: 4,
    },
    {
      id: generateId(),
      projectId: 'sample-001',
      version: 4,
      timestamp: new Date(now - 1 * day).toISOString(),
      rooms: baseRooms001,
      changeDescription: 'Added coffee table',
      itemCount: 2,
      wallCount: 4,
    },
    {
      id: generateId(),
      projectId: 'sample-001',
      version: 5,
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      rooms: [
        {
          ...baseRooms001[0],
          placedItems: [
            ...baseRooms001[0].placedItems,
            { id: 'pi3', furnitureId: 'bed-002', x: 380, y: 120, rotation: 0, scale: 1 },
            { id: 'pi4', furnitureId: 'tv-unit-001', x: 120, y: 80, rotation: 0, scale: 1 },
            { id: 'pi5', furnitureId: 'plant-001', x: 480, y: 340, rotation: 0, scale: 1 },
          ],
        },
      ],
      changeDescription: 'Added 3 furniture items',
      itemCount: 5,
      wallCount: 4,
    },
    // sample-002 snapshots
    {
      id: generateId(),
      projectId: 'sample-002',
      version: 1,
      timestamp: new Date(now - 7 * day).toISOString(),
      rooms: [{ ...baseRooms002[0], placedItems: [], walls: baseRooms002[0].walls.slice(0, 2) }],
      changeDescription: 'Created project',
      itemCount: 0,
      wallCount: 2,
    },
    {
      id: generateId(),
      projectId: 'sample-002',
      version: 2,
      timestamp: new Date(now - 6 * day).toISOString(),
      rooms: [{ ...baseRooms002[0], placedItems: [] }],
      changeDescription: 'Completed room walls',
      itemCount: 0,
      wallCount: 4,
    },
    {
      id: generateId(),
      projectId: 'sample-002',
      version: 3,
      timestamp: new Date(now - 5 * day).toISOString(),
      rooms: [{ ...baseRooms002[0], placedItems: [baseRooms002[0].placedItems[0]] }],
      changeDescription: 'Added bed',
      itemCount: 1,
      wallCount: 4,
    },
    {
      id: generateId(),
      projectId: 'sample-002',
      version: 4,
      timestamp: new Date(now - 3 * day).toISOString(),
      rooms: baseRooms002,
      changeDescription: 'Added nightstand',
      itemCount: 2,
      wallCount: 4,
    },
    {
      id: generateId(),
      projectId: 'sample-002',
      version: 5,
      timestamp: new Date(now - 1 * day).toISOString(),
      rooms: [
        {
          ...baseRooms002[0],
          placedItems: [
            ...baseRooms002[0].placedItems,
            { id: 'pi9', furnitureId: 'wardrobe-001', x: 100, y: 260, rotation: 0, scale: 1 },
            { id: 'pi10', furnitureId: 'nightstand-001', x: 310, y: 120, rotation: 0, scale: 1 },
          ],
        },
      ],
      changeDescription: 'Added wardrobe & second nightstand',
      itemCount: 4,
      wallCount: 4,
    },
  ];
}

const initialState: State = {
  snapshots: [],
  loaded: false,
};

const HistoryContext = createContext<HistoryContextType | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    async function load() {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const parsed: ProjectSnapshot[] = JSON.parse(json);
          dispatch({ type: 'LOAD', snapshots: parsed });
        } else {
          const mocks = buildMockSnapshots();
          dispatch({ type: 'LOAD', snapshots: mocks });
        }
      } catch {
        dispatch({ type: 'LOAD', snapshots: buildMockSnapshots() });
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.snapshots)).catch(() => {});
  }, [state.snapshots, state.loaded]);

  const getSnapshotsForProject = useCallback((projectId: string): ProjectSnapshot[] => {
    return state.snapshots
      .filter(s => s.projectId === projectId)
      .sort((a, b) => a.version - b.version);
  }, [state.snapshots]);

  const saveSnapshot = useCallback((projectId: string, rooms: Room[], changeDescription: string) => {
    const projectSnaps = state.snapshots.filter(s => s.projectId === projectId);
    const nextVersion = projectSnaps.length > 0
      ? Math.max(...projectSnaps.map(s => s.version)) + 1
      : 1;
    const snapshot: ProjectSnapshot = {
      id: generateId(),
      projectId,
      version: nextVersion,
      timestamp: new Date().toISOString(),
      rooms: JSON.parse(JSON.stringify(rooms)),
      changeDescription,
      itemCount: countItems(rooms),
      wallCount: countWalls(rooms),
    };
    console.log('[History] Save snapshot v' + nextVersion + ' for project:', projectId, '—', changeDescription);
    dispatch({ type: 'SAVE_SNAPSHOT', snapshot });
  }, [state.snapshots]);

  const restoreSnapshot = useCallback((projectId: string, snapshotId: string): Room[] | null => {
    const snapshot = state.snapshots.find(s => s.id === snapshotId && s.projectId === projectId);
    if (!snapshot) {
      console.log('[History] Restore failed — snapshot not found:', snapshotId);
      return null;
    }
    console.log('[History] Restore snapshot v' + snapshot.version + ' for project:', projectId);
    return JSON.parse(JSON.stringify(snapshot.rooms));
  }, [state.snapshots]);

  const clearHistory = useCallback((projectId: string) => {
    console.log('[History] Clear history for project:', projectId);
    dispatch({ type: 'CLEAR_HISTORY', projectId });
  }, []);

  return (
    <HistoryContext.Provider value={{
      snapshots: state.snapshots,
      getSnapshotsForProject,
      saveSnapshot,
      restoreSnapshot,
      clearHistory,
    }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}
