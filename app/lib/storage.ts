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

export async function getAllProjects(): Promise<string[]> {
  const db = await getDB();
  return await db.getAllKeys(STORE_NAME);
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, projectId);
}

export function createEmptyProject(): ProjectData {
  return {
    tracks: [
      { id: 1, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
      { id: 2, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
      { id: 3, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
      { id: 4, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
    ],
    counterPosition: 0,
    cassetteTitle: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
