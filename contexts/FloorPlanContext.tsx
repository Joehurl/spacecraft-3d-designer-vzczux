import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FloorPlan, Room, Wall, PlacedItem } from '@/types';

const STORAGE_KEY = '@spacecraft3d_projects';
const FAVORITES_KEY = '@spacecraft3d_favorites';

interface FloorPlanContextType {
  projects: FloorPlan[];
  activeProjectId: string | null;
  activeRoomId: string | null;
  setActiveProject: (id: string) => void;
  setActiveRoom: (id: string | null) => void;
  createProject: (name: string, style: FloorPlan['style']) => FloorPlan;
  updateProject: (id: string, updates: Partial<FloorPlan>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  addRoom: (projectId: string, room: Partial<Room>) => Room;
  updateRoom: (projectId: string, roomId: string, updates: Partial<Room>) => void;
  addWall: (projectId: string, roomId: string, wall: Omit<Wall, 'id'>) => void;
  addPlacedItem: (projectId: string, roomId: string, item: Omit<PlacedItem, 'id'>) => void;
  updatePlacedItem: (projectId: string, roomId: string, itemId: string, updates: Partial<PlacedItem>) => void;
  removePlacedItem: (projectId: string, roomId: string, itemId: string) => void;
  favorites: string[];
  toggleFavorite: (furnitureId: string) => void;
  undoStack: FloorPlan[][];
  redoStack: FloorPlan[][];
  undo: () => void;
  redo: () => void;
}

interface State {
  projects: FloorPlan[];
  activeProjectId: string | null;
  activeRoomId: string | null;
  favorites: string[];
  undoStack: FloorPlan[][];
  redoStack: FloorPlan[][];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; projects: FloorPlan[]; favorites: string[] }
  | { type: 'SET_ACTIVE_PROJECT'; id: string }
  | { type: 'SET_ACTIVE_ROOM'; id: string | null }
  | { type: 'CREATE_PROJECT'; project: FloorPlan }
  | { type: 'UPDATE_PROJECT'; id: string; updates: Partial<FloorPlan> }
  | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'DUPLICATE_PROJECT'; id: string }
  | { type: 'ADD_ROOM'; projectId: string; room: Room }
  | { type: 'UPDATE_ROOM'; projectId: string; roomId: string; updates: Partial<Room> }
  | { type: 'ADD_WALL'; projectId: string; roomId: string; wall: Wall }
  | { type: 'ADD_PLACED_ITEM'; projectId: string; roomId: string; item: PlacedItem }
  | { type: 'UPDATE_PLACED_ITEM'; projectId: string; roomId: string; itemId: string; updates: Partial<PlacedItem> }
  | { type: 'REMOVE_PLACED_ITEM'; projectId: string; roomId: string; itemId: string }
  | { type: 'TOGGLE_FAVORITE'; furnitureId: string }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function updateProjectInList(projects: FloorPlan[], id: string, updater: (p: FloorPlan) => FloorPlan): FloorPlan[] {
  return projects.map(p => p.id === id ? updater(p) : p);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { ...state, projects: action.projects, favorites: action.favorites, loaded: true };

    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProjectId: action.id };

    case 'SET_ACTIVE_ROOM':
      return { ...state, activeRoomId: action.id };

    case 'CREATE_PROJECT': {
      const newProjects = [...state.projects, action.project];
      return {
        ...state,
        projects: newProjects,
        activeProjectId: action.project.id,
        undoStack: [...state.undoStack, state.projects],
        redoStack: [],
      };
    }

    case 'UPDATE_PROJECT': {
      const newProjects = updateProjectInList(state.projects, action.id, p => ({
        ...p,
        ...action.updates,
        updatedAt: new Date().toISOString(),
      }));
      return {
        ...state,
        projects: newProjects,
        undoStack: [...state.undoStack.slice(-20), state.projects],
        redoStack: [],
      };
    }

    case 'DELETE_PROJECT': {
      const newProjects = state.projects.filter(p => p.id !== action.id);
      return {
        ...state,
        projects: newProjects,
        activeProjectId: state.activeProjectId === action.id ? null : state.activeProjectId,
        undoStack: [...state.undoStack.slice(-20), state.projects],
        redoStack: [],
      };
    }

    case 'DUPLICATE_PROJECT': {
      const original = state.projects.find(p => p.id === action.id);
      if (!original) return state;
      const duplicate: FloorPlan = {
        ...original,
        id: generateId(),
        name: `${original.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        projects: [...state.projects, duplicate],
        undoStack: [...state.undoStack.slice(-20), state.projects],
        redoStack: [],
      };
    }

    case 'ADD_ROOM': {
      const newProjects = updateProjectInList(state.projects, action.projectId, p => ({
        ...p,
        rooms: [...p.rooms, action.room],
        updatedAt: new Date().toISOString(),
      }));
      return { ...state, projects: newProjects };
    }

    case 'UPDATE_ROOM': {
      const newProjects = updateProjectInList(state.projects, action.projectId, p => ({
        ...p,
        rooms: p.rooms.map(r => r.id === action.roomId ? { ...r, ...action.updates } : r),
        updatedAt: new Date().toISOString(),
      }));
      return {
        ...state,
        projects: newProjects,
        undoStack: [...state.undoStack.slice(-20), state.projects],
        redoStack: [],
      };
    }

    case 'ADD_WALL': {
      const newProjects = updateProjectInList(state.projects, action.projectId, p => ({
        ...p,
        rooms: p.rooms.map(r => r.id === action.roomId
          ? { ...r, walls: [...r.walls, action.wall] }
          : r
        ),
        updatedAt: new Date().toISOString(),
      }));
      return {
        ...state,
        projects: newProjects,
        undoStack: [...state.undoStack.slice(-20), state.projects],
        redoStack: [],
      };
    }

    case 'ADD_PLACED_ITEM': {
      const newProjects = updateProjectInList(state.projects, action.projectId, p => ({
        ...p,
        rooms: p.rooms.map(r => r.id === action.roomId
          ? { ...r, placedItems: [...r.placedItems, action.item] }
          : r
        ),
        updatedAt: new Date().toISOString(),
      }));
      return {
        ...state,
        projects: newProjects,
        undoStack: [...state.undoStack.slice(-20), state.projects],
        redoStack: [],
      };
    }

    case 'UPDATE_PLACED_ITEM': {
      const newProjects = updateProjectInList(state.projects, action.projectId, p => ({
        ...p,
        rooms: p.rooms.map(r => r.id === action.roomId
          ? {
              ...r,
              placedItems: r.placedItems.map(item =>
                item.id === action.itemId ? { ...item, ...action.updates } : item
              ),
            }
          : r
        ),
        updatedAt: new Date().toISOString(),
      }));
      return {
        ...state,
        projects: newProjects,
        undoStack: [...state.undoStack.slice(-20), state.projects],
        redoStack: [],
      };
    }

    case 'REMOVE_PLACED_ITEM': {
      const newProjects = updateProjectInList(state.projects, action.projectId, p => ({
        ...p,
        rooms: p.rooms.map(r => r.id === action.roomId
          ? { ...r, placedItems: r.placedItems.filter(item => item.id !== action.itemId) }
          : r
        ),
        updatedAt: new Date().toISOString(),
      }));
      return {
        ...state,
        projects: newProjects,
        undoStack: [...state.undoStack.slice(-20), state.projects],
        redoStack: [],
      };
    }

    case 'TOGGLE_FAVORITE': {
      const isFav = state.favorites.includes(action.furnitureId);
      return {
        ...state,
        favorites: isFav
          ? state.favorites.filter(id => id !== action.furnitureId)
          : [...state.favorites, action.furnitureId],
      };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        projects: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.projects],
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        projects: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.projects],
      };
    }

    default:
      return state;
  }
}

// ─── Sample seed data ─────────────────────────────────────────────────────────
const SAMPLE_PROJECTS: FloorPlan[] = [
  {
    id: 'sample-001',
    name: 'Modern Studio Apartment',
    style: 'modern',
    totalArea: 45,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    rooms: [
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
        windows: [
          { id: 'win1', wallId: 'w1', position: 0.3, width: 100 },
          { id: 'win2', wallId: 'w1', position: 0.7, width: 100 },
        ],
        placedItems: [
          { id: 'pi1', furnitureId: 'sofa-001', x: 120, y: 200, rotation: 0, scale: 1, color: '#4A4A4A' },
          { id: 'pi2', furnitureId: 'coffee-001', x: 200, y: 280, rotation: 0, scale: 1 },
          { id: 'pi3', furnitureId: 'bed-002', x: 380, y: 120, rotation: 0, scale: 1 },
          { id: 'pi4', furnitureId: 'tv-unit-001', x: 120, y: 80, rotation: 0, scale: 1 },
          { id: 'pi5', furnitureId: 'plant-001', x: 480, y: 340, rotation: 0, scale: 1 },
        ],
      },
    ],
  },
  {
    id: 'sample-002',
    name: 'Cozy Bedroom',
    style: 'scandinavian',
    totalArea: 18,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    rooms: [
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
          { id: 'pi8', furnitureId: 'nightstand-001', x: 310, y: 120, rotation: 0, scale: 1 },
          { id: 'pi9', furnitureId: 'wardrobe-001', x: 100, y: 260, rotation: 0, scale: 1 },
        ],
      },
    ],
  },
];

const initialState: State = {
  projects: [],
  activeProjectId: null,
  activeRoomId: null,
  favorites: [],
  undoStack: [],
  redoStack: [],
  loaded: false,
};

const FloorPlanContext = createContext<FloorPlanContextType | null>(null);

export function FloorPlanProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from storage on mount
  useEffect(() => {
    async function load() {
      try {
        const [projectsJson, favoritesJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(FAVORITES_KEY),
        ]);
        const projects = projectsJson ? JSON.parse(projectsJson) : SAMPLE_PROJECTS;
        const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];
        dispatch({ type: 'LOAD', projects, favorites });
      } catch {
        dispatch({ type: 'LOAD', projects: SAMPLE_PROJECTS, favorites: [] });
      }
    }
    load();
  }, []);

  // Persist on change
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects)).catch(() => {});
  }, [state.projects, state.loaded]);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites)).catch(() => {});
  }, [state.favorites, state.loaded]);

  const setActiveProject = useCallback((id: string) => {
    console.log('[FloorPlan] Set active project:', id);
    dispatch({ type: 'SET_ACTIVE_PROJECT', id });
  }, []);

  const setActiveRoom = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', id });
  }, []);

  const createProject = useCallback((name: string, style: FloorPlan['style']): FloorPlan => {
    console.log('[FloorPlan] Create project:', name, style);
    const defaultRoom: Room = {
      id: generateId(),
      name: 'Living Room',
      type: 'living',
      walls: [
        { id: generateId(), x1: 50, y1: 50, x2: 450, y2: 50, thickness: 10 },
        { id: generateId(), x1: 450, y1: 50, x2: 450, y2: 350, thickness: 10 },
        { id: generateId(), x1: 450, y1: 350, x2: 50, y2: 350, thickness: 10 },
        { id: generateId(), x1: 50, y1: 350, x2: 50, y2: 50, thickness: 10 },
      ],
      doors: [],
      windows: [],
      placedItems: [],
      floorColor: '#E8E0D0',
      wallColor: '#F5F5F0',
      width: 500,
      height: 400,
    };
    const project: FloorPlan = {
      id: generateId(),
      name,
      style,
      rooms: [defaultRoom],
      totalArea: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE_PROJECT', project });
    return project;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<FloorPlan>) => {
    dispatch({ type: 'UPDATE_PROJECT', id, updates });
  }, []);

  const deleteProject = useCallback((id: string) => {
    console.log('[FloorPlan] Delete project:', id);
    dispatch({ type: 'DELETE_PROJECT', id });
  }, []);

  const duplicateProject = useCallback((id: string) => {
    console.log('[FloorPlan] Duplicate project:', id);
    dispatch({ type: 'DUPLICATE_PROJECT', id });
  }, []);

  const addRoom = useCallback((projectId: string, roomData: Partial<Room>): Room => {
    const room: Room = {
      id: generateId(),
      name: roomData.name ?? 'New Room',
      type: roomData.type ?? 'other',
      walls: roomData.walls ?? [],
      doors: roomData.doors ?? [],
      windows: roomData.windows ?? [],
      placedItems: roomData.placedItems ?? [],
      floorColor: roomData.floorColor ?? '#E8E0D0',
      wallColor: roomData.wallColor ?? '#F5F5F0',
      width: roomData.width ?? 400,
      height: roomData.height ?? 300,
    };
    dispatch({ type: 'ADD_ROOM', projectId, room });
    return room;
  }, []);

  const updateRoom = useCallback((projectId: string, roomId: string, updates: Partial<Room>) => {
    dispatch({ type: 'UPDATE_ROOM', projectId, roomId, updates });
  }, []);

  const addWall = useCallback((projectId: string, roomId: string, wallData: Omit<Wall, 'id'>) => {
    console.log('[FloorPlan] Add wall to room:', roomId);
    const wall: Wall = { ...wallData, id: generateId() };
    dispatch({ type: 'ADD_WALL', projectId, roomId, wall });
  }, []);

  const addPlacedItem = useCallback((projectId: string, roomId: string, itemData: Omit<PlacedItem, 'id'>) => {
    console.log('[FloorPlan] Add furniture:', itemData.furnitureId, 'to room:', roomId);
    const item: PlacedItem = { ...itemData, id: generateId() };
    dispatch({ type: 'ADD_PLACED_ITEM', projectId, roomId, item });
  }, []);

  const updatePlacedItem = useCallback((projectId: string, roomId: string, itemId: string, updates: Partial<PlacedItem>) => {
    dispatch({ type: 'UPDATE_PLACED_ITEM', projectId, roomId, itemId, updates });
  }, []);

  const removePlacedItem = useCallback((projectId: string, roomId: string, itemId: string) => {
    console.log('[FloorPlan] Remove furniture item:', itemId);
    dispatch({ type: 'REMOVE_PLACED_ITEM', projectId, roomId, itemId });
  }, []);

  const toggleFavorite = useCallback((furnitureId: string) => {
    console.log('[FloorPlan] Toggle favorite:', furnitureId);
    dispatch({ type: 'TOGGLE_FAVORITE', furnitureId });
  }, []);

  const undo = useCallback(() => {
    console.log('[FloorPlan] Undo');
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    console.log('[FloorPlan] Redo');
    dispatch({ type: 'REDO' });
  }, []);

  return (
    <FloorPlanContext.Provider value={{
      projects: state.projects,
      activeProjectId: state.activeProjectId,
      activeRoomId: state.activeRoomId,
      setActiveProject,
      setActiveRoom,
      createProject,
      updateProject,
      deleteProject,
      duplicateProject,
      addRoom,
      updateRoom,
      addWall,
      addPlacedItem,
      updatePlacedItem,
      removePlacedItem,
      favorites: state.favorites,
      toggleFavorite,
      undoStack: state.undoStack,
      redoStack: state.redoStack,
      undo,
      redo,
    }}>
      {children}
    </FloorPlanContext.Provider>
  );
}

export function useFloorPlan() {
  const ctx = useContext(FloorPlanContext);
  if (!ctx) throw new Error('useFloorPlan must be used within FloorPlanProvider');
  return ctx;
}
