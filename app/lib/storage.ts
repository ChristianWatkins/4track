import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ProjectData, TrackData } from './types';

interface RecorderDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectData;
  };
}

const DB_NAME = '4track-recorder';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

let dbInstance: IDBPDatabase<RecorderDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<RecorderDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<RecorderDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });

  return dbInstance;
}

export async function saveProject(projectId: string, data: ProjectData): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, { ...data, updatedAt: Date.now() }, projectId);
}

export async function loadProject(projectId: string): Promise<ProjectData | null> {
  const db = await getDB();
  return (await db.get(STORE_NAME, projectId)) || null;
}

export async function getAllProjects(): Promise<Array<{ id: string; data: ProjectData }>> {
  const db = await getDB();
  const keys = await db.getAllKeys(STORE_NAME);
  const projects = await Promise.all(
    keys.map(async (key) => {
      const data = await db.get(STORE_NAME, key);
      return { id: String(key), data: data! };
    })
  );
  // Sort by updatedAt, most recent first
  return projects.sort((a, b) => b.data.updatedAt - a.data.updatedAt);
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, projectId);
}

export function createEmptyProject(): ProjectData {
  // Random cassette colors
  const colors = [
    '#ff6b35', // Orange
    '#4ade80', // Green
    '#60a5fa', // Blue
    '#f472b6', // Pink
    '#a78bfa', // Purple
    '#fbbf24', // Yellow
    '#ef4444', // Red
    '#14b8a6', // Teal
    '#fb923c', // Light Orange
    '#c084fc', // Light Purple
  ];
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  return {
    tracks: [
      { id: 1, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
      { id: 2, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
      { id: 3, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
      { id: 4, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
    ],
    counterPosition: 0,
    cassetteTitle: '',
    cassetteColor: randomColor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
