'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Project, Room, RoomType } from '@/types';
import { duplicateRoom, newProject, newRoom } from '@/lib/rooms';

// Calculator state. The draft project is kept in localStorage — it holds only
// room parameters, never the customer's name or phone.

const STORAGE_KEY = 'lumiere:project:v1';

export interface DesignPreset {
  catalogId: string;
  name: string;
  materialId: string | null;
  colorId?: string | null;
  lighting?: Record<string, number>;
}

interface Ctx {
  project: Project;
  activeRoom: Room | null;
  preset: DesignPreset | null;
  setPreset: (p: DesignPreset | null) => void;
  addRoom: (type: RoomType) => Room;
  updateRoom: (id: string, fn: (r: Room) => Room) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  setActive: (id: string) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
  /** Set when a catalog design was applied while loading. */
  initialNotice: string | null;
}

const ProjectContext = createContext<Ctx | null>(null);

interface Stored {
  project: Project;
  preset: DesignPreset | null;
}

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (!s?.project?.id || !Array.isArray(s.project.rooms)) return null;
    return s;
  } catch {
    return null;
  }
}

interface Init extends Stored {
  notice: string | null;
}

/** Loads the saved draft and applies a design chosen in the catalog (?design=…). */
function init(design: DesignPreset | null): Init {
  const saved = load();
  const project = saved?.project ?? newProject();
  let preset = saved?.preset ?? null;
  let notice: string | null = null;
  if (design) {
    preset = design;
    const active = project.rooms.find((r) => r.id === project.activeRoomId) ?? project.rooms[0];
    if (active) {
      project.rooms = project.rooms.map((r) =>
        r.id === active.id ? { ...r, materialId: design.materialId, colorId: design.colorId ?? r.colorId, lighting: { ...r.lighting, ...(design.lighting ?? {}) } } : r,
      );
      notice = `Дизайн «${design.name}» применён к комнате «${active.name}».`;
    } else {
      notice = `Вы выбрали «${design.name}». Добавьте первую комнату.`;
    }
  }
  return { project, preset, notice };
}

/** Client-only (rendered with ssr: false), so localStorage is available on first render. */
export function ProjectProvider({ children, design = null }: { children: ReactNode; design?: DesignPreset | null }) {
  const [initial] = useState(() => init(design));
  const [project, setProject] = useState<Project>(initial.project);
  const [preset, setPreset] = useState<DesignPreset | null>(initial.preset);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, preset } satisfies Stored));
    } catch {
      // Private mode / quota — the calculator still works for this visit.
    }
  }, [project, preset]);

  const touch = (p: Project): Project => ({ ...p, updatedAt: new Date().toISOString() });

  const addRoom = useCallback(
    (type: RoomType) => {
      const room = newRoom(type, project.rooms, preset?.materialId ?? null);
      if (preset?.colorId) room.colorId = preset.colorId;
      if (preset?.lighting) room.lighting = { ...preset.lighting };
      setProject((p) => touch({ ...p, rooms: [...p.rooms, room], activeRoomId: room.id }));
      return room;
    },
    [project.rooms, preset],
  );

  const updateRoom = useCallback((id: string, fn: (r: Room) => Room) => {
    setProject((p) => touch({ ...p, rooms: p.rooms.map((r) => (r.id === id ? fn(r) : r)) }));
  }, []);

  const duplicate = useCallback((id: string) => {
    setProject((p) => {
      const src = p.rooms.find((r) => r.id === id);
      if (!src) return p;
      const copy = duplicateRoom(src, p.rooms);
      const i = p.rooms.indexOf(src);
      const rooms = [...p.rooms.slice(0, i + 1), copy, ...p.rooms.slice(i + 1)];
      return touch({ ...p, rooms, activeRoomId: copy.id });
    });
  }, []);

  const remove = useCallback((id: string) => {
    setProject((p) => {
      const i = p.rooms.findIndex((r) => r.id === id);
      const rooms = p.rooms.filter((r) => r.id !== id);
      const activeRoomId = p.activeRoomId === id ? (rooms[Math.max(0, i - 1)]?.id ?? null) : p.activeRoomId;
      return touch({ ...p, rooms, activeRoomId });
    });
  }, []);

  const setActive = useCallback((id: string) => setProject((p) => ({ ...p, activeRoomId: id })), []);
  const setNotes = useCallback((notes: string) => setProject((p) => touch({ ...p, notes })), []);
  const reset = useCallback(() => {
    setProject(newProject());
    setPreset(null);
  }, []);

  const activeRoom = project.rooms.find((r) => r.id === project.activeRoomId) ?? project.rooms[0] ?? null;

  const value = useMemo<Ctx>(
    () => ({ project, activeRoom, preset, setPreset, addRoom, updateRoom, duplicate, remove, setActive, setNotes, reset, initialNotice: initial.notice }),
    [project, activeRoom, preset, addRoom, updateRoom, duplicate, remove, setActive, setNotes, reset, initial.notice],
  );
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): Ctx {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject outside ProjectProvider');
  return ctx;
}
