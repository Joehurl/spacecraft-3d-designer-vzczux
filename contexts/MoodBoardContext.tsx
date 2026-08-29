import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@spacecraft3d_moodboards';

export interface MoodBoardItem {
  id: string;
  type: 'color' | 'furniture' | 'image' | 'note' | 'tag';
  x: number;
  y: number;
  zIndex: number;
  data: {
    // color
    color?: string;
    label?: string;
    // furniture
    furnitureId?: string;
    furnitureName?: string;
    furnitureEmoji?: string;
    furniturePrice?: string;
    // image
    imageLabel?: string;
    gradientColors?: string[];
    imageEmoji?: string;
    // note
    text?: string;
    noteColor?: string;
    // tag
    tagText?: string;
  };
}

export interface MoodBoard {
  id: string;
  projectId: string;
  items: MoodBoardItem[];
  updatedAt: string;
}

interface MoodBoardContextType {
  boards: MoodBoard[];
  getBoardForProject: (projectId: string) => MoodBoard | null;
  addItem: (projectId: string, item: Omit<MoodBoardItem, 'id' | 'zIndex'>) => void;
  updateItem: (projectId: string, itemId: string, updates: Partial<MoodBoardItem>) => void;
  removeItem: (projectId: string, itemId: string) => void;
  clearBoard: (projectId: string) => void;
  bringToFront: (projectId: string, itemId: string) => void;
}

const MoodBoardContext = createContext<MoodBoardContextType | null>(null);

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function MoodBoardProvider({ children }: { children: React.ReactNode }) {
  const [boards, setBoards] = useState<MoodBoard[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setBoards(JSON.parse(raw));
        } catch {
          setBoards([]);
        }
      }
    });
  }, []);

  const persist = useCallback((next: MoodBoard[]) => {
    setBoards(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const getOrCreateBoard = useCallback(
    (projectId: string, current: MoodBoard[]): { board: MoodBoard; all: MoodBoard[] } => {
      const existing = current.find((b) => b.projectId === projectId);
      if (existing) return { board: existing, all: current };
      const board: MoodBoard = {
        id: generateId(),
        projectId,
        items: [],
        updatedAt: new Date().toISOString(),
      };
      return { board, all: [...current, board] };
    },
    []
  );

  const getBoardForProject = useCallback(
    (projectId: string): MoodBoard | null => {
      return boards.find((b) => b.projectId === projectId) ?? null;
    },
    [boards]
  );

  const addItem = useCallback(
    (projectId: string, item: Omit<MoodBoardItem, 'id' | 'zIndex'>) => {
      console.log('[MoodBoard] Add item type:', item.type, 'to project:', projectId);
      setBoards((prev) => {
        const { board, all } = getOrCreateBoard(projectId, prev);
        const maxZ = board.items.reduce((m, i) => Math.max(m, i.zIndex ?? 0), 0);
        const newItem: MoodBoardItem = { ...item, id: generateId(), zIndex: maxZ + 1 };
        const updated: MoodBoard = {
          ...board,
          items: [...board.items, newItem],
          updatedAt: new Date().toISOString(),
        };
        const next = all.map((b) => (b.projectId === projectId ? updated : b));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [getOrCreateBoard]
  );

  const updateItem = useCallback(
    (projectId: string, itemId: string, updates: Partial<MoodBoardItem>) => {
      setBoards((prev) => {
        const next = prev.map((b) => {
          if (b.projectId !== projectId) return b;
          return {
            ...b,
            items: b.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
            updatedAt: new Date().toISOString(),
          };
        });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const removeItem = useCallback(
    (projectId: string, itemId: string) => {
      console.log('[MoodBoard] Remove item:', itemId, 'from project:', projectId);
      setBoards((prev) => {
        const next = prev.map((b) => {
          if (b.projectId !== projectId) return b;
          return {
            ...b,
            items: b.items.filter((i) => i.id !== itemId),
            updatedAt: new Date().toISOString(),
          };
        });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const clearBoard = useCallback(
    (projectId: string) => {
      console.log('[MoodBoard] Clear board for project:', projectId);
      setBoards((prev) => {
        const next = prev.map((b) => {
          if (b.projectId !== projectId) return b;
          return { ...b, items: [], updatedAt: new Date().toISOString() };
        });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const bringToFront = useCallback(
    (projectId: string, itemId: string) => {
      setBoards((prev) => {
        const next = prev.map((b) => {
          if (b.projectId !== projectId) return b;
          const maxZ = b.items.reduce((m, i) => Math.max(m, i.zIndex ?? 0), 0);
          return {
            ...b,
            items: b.items.map((i) => (i.id === itemId ? { ...i, zIndex: maxZ + 1 } : i)),
          };
        });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  return (
    <MoodBoardContext.Provider
      value={{ boards, getBoardForProject, addItem, updateItem, removeItem, clearBoard, bringToFront }}
    >
      {children}
    </MoodBoardContext.Provider>
  );
}

export function useMoodBoard() {
  const ctx = useContext(MoodBoardContext);
  if (!ctx) throw new Error('useMoodBoard must be used within MoodBoardProvider');
  return ctx;
}
