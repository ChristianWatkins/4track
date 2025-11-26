export type TrackNumber = 1 | 2 | 3 | 4;

export interface TrackData {
  id: TrackNumber;
  audioBuffer: ArrayBuffer | null;
  duration: number;
  sampleRate: number;
  name?: string;
}

export interface ProjectData {
  tracks: TrackData[];
  counterPosition: number;
  cassetteTitle?: string;
  cassetteColor?: string; // Hex color for cassette
  createdAt: number;
  updatedAt: number;
}

export type TransportState = 'stopped' | 'playing' | 'recording' | 'paused';

export interface AudioEngineState {
  state: TransportState;
  position: number;
  armedTracks: TrackNumber[];
  trackVolumes: [number, number, number, number];
  trackLevels: [number, number, number, number]; // VU meter levels 0-1
  counterPosition: number;
}
