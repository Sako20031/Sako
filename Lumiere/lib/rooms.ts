import type { Project, Room, RoomShape, RoomType } from '../types/index.ts';
import { projectCode, randomId } from './ids.ts';

export const ROOM_TYPES: { id: RoomType; label: string; hint: string }[] = [
  { id: 'living', label: 'Гостиная', hint: 'Свет для отдыха и гостей' },
  { id: 'bedroom', label: 'Спальня', hint: 'Мягкий спокойный свет' },
  { id: 'kitchen', label: 'Кухня', hint: 'Рабочая зона и обеденный стол' },
  { id: 'bathroom', label: 'Ванная', hint: 'Влажное помещение' },
  { id: 'hallway', label: 'Коридор', hint: 'Узкое пространство, ниши' },
  { id: 'kids', label: 'Детская', hint: 'Игровая и спальная зоны' },
  { id: 'commercial', label: 'Коммерческое помещение', hint: 'Офис, магазин, салон' },
  { id: 'other', label: 'Другая комната', hint: 'Кабинет, гардеробная, балкон' },
];

export const roomTypeLabel = (t: RoomType) => ROOM_TYPES.find((r) => r.id === t)?.label ?? 'Комната';

export function emptyShape(): RoomShape {
  return {
    kind: 'rect',
    rect: { length: null, width: null },
    lshape: { method: 'cutout', length: null, width: null, cutLength: null, cutWidth: null, a: { length: null, width: null }, b: { length: null, width: null } },
    modifiers: [],
    custom: {
      mode: 'draw',
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 4 },
        { x: 0, y: 4 },
      ],
      manualArea: null,
      manualPerimeter: null,
    },
  };
}

export function newRoom(type: RoomType, existing: Room[] = [], materialId: string | null = null): Room {
  const label = roomTypeLabel(type);
  const same = existing.filter((r) => r.type === type).length;
  return {
    id: randomId(8),
    name: same ? `${label} ${same + 1}` : label,
    type,
    shape: emptyShape(),
    height: null,
    approximate: false,
    sloped: false,
    technical: {},
    technicalNotes: '',
    materialId,
    colorId: 'white',
    temperature: null,
    lighting: {},
    curtain: { enabled: false, typeId: null, length: null },
    services: {},
    notes: '',
  };
}

export function duplicateRoom(room: Room, existing: Room[]): Room {
  const copy: Room = structuredClone(room);
  copy.id = randomId(8);
  let name = `${room.name} (копия)`;
  let i = 2;
  while (existing.some((r) => r.name === name)) name = `${room.name} (копия ${i++})`;
  copy.name = name;
  return copy;
}

export function newProject(): Project {
  const now = new Date().toISOString();
  return { id: projectCode(), createdAt: now, updatedAt: now, rooms: [], activeRoomId: null, notes: '' };
}
