'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from '@/app/lib/audio-engine';
import { TrackData, TrackNumber, TransportState } from '@/app/lib/types';

export function useAudioRecorder() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<TransportState>('stopped');
  const [position, setPosition] = useState(0);
  const [counterPosition, setCounterPosition] = useState(0);
  const [armedTracks, setArmedTracks] = useState<TrackNumber[]>([]);
  const [trackLevels, setTrackLevels] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [trackVolumes, setTrackVolumes] = useState<[number, number, number, number]>([1, 1, 1, 1]);
  const [trackLatencyFix, setTrackLatencyFixState] = useState<[boolean, boolean, boolean, boolean]>([false, false, false, false]);
  const [tracks, setTracks] = useState<TrackData[]>([
    { id: 1, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
    { id: 2, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
    { id: 3, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
    { id: 4, audioBuffer: null, duration: 0, sampleRate: 44100, name: '' },
  ]);
  const recordingArmedTracksRef = useRef<TrackNumber[]>([]);
  const prevStateRef = useRef<TransportState>('stopped');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const engine = new AudioEngine();
    engineRef.current = engine;

    engine.setOnPositionUpdate((pos) => {
      setPosition(pos);
    });

    engine.setOnStateChange((newState) => {
      setState(newState);
    });

    engine.setOnTracksUpdate((newTracks) => {
      setTracks(newTracks);
    });

    engine.setOnLevelsUpdate((levels) => {
      setTrackLevels(levels);
    });

    engine.setTracks(tracks);

    // Initialize volumes to 1 (0 dB) for all tracks
    for (let i = 1; i <= 4; i++) {
      const trackNum = i as TrackNumber;
      engine.setTrackVolume(trackNum, 1);
    }

    // Track offsets default to 0 (no offset)

    return () => {
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTracks(tracks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  // Automatically disarm tracks after recording stops
  useEffect(() => {
    // When state changes from 'recording' to something else, disarm the tracks that were recording
    if (prevStateRef.current === 'recording' && state !== 'recording' && recordingArmedTracksRef.current.length > 0) {
      const tracksToDisarm = [...recordingArmedTracksRef.current];
      recordingArmedTracksRef.current = [];
      
      // Disarm each track that was recording
      const disarmPromises = tracksToDisarm.map(async (trackNum) => {
        if (engineRef.current && engineRef.current.isTrackArmed(trackNum)) {
          await engineRef.current.toggleArmTrack(trackNum);
        }
      });
      
      // Wait for all disarm operations to complete, then update state
      Promise.all(disarmPromises).then(() => {
        if (engineRef.current) {
          const engineArmed: TrackNumber[] = [];
          for (let i = 1; i <= 4; i++) {
            const trackNum = i as TrackNumber;
            if (engineRef.current.isTrackArmed(trackNum)) {
              engineArmed.push(trackNum);
            }
          }
          setArmedTracks(engineArmed);
        }
      });
    }
    
    // Update previous state
    prevStateRef.current = state;
  }, [state]);

  const play = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.play();
    }
  }, []);

  const stop = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.stop();
    }
  }, []);

  const record = useCallback(async () => {
    if (engineRef.current) {
      // Save which tracks were armed before recording starts
      const engineArmed: TrackNumber[] = [];
      for (let i = 1; i <= 4; i++) {
        const trackNum = i as TrackNumber;
        if (engineRef.current.isTrackArmed(trackNum)) {
          engineArmed.push(trackNum);
        }
      }
      recordingArmedTracksRef.current = [...engineArmed];
      
      await engineRef.current.record();
      // Sync armed tracks from engine
      setArmedTracks(engineArmed);
    }
  }, []);

  const seek = useCallback((pos: number) => {
    if (engineRef.current) {
      engineRef.current.seek(pos);
    }
  }, []);

  const toggleArmTrack = useCallback(async (track: TrackNumber) => {
    if (engineRef.current) {
      await engineRef.current.toggleArmTrack(track);
      const isArmed = engineRef.current.isTrackArmed(track);
      setArmedTracks((prev) => {
        if (isArmed) {
          return prev.includes(track) ? prev : [...prev, track];
        } else {
          return prev.filter((t) => t !== track);
        }
      });
    }
  }, []);

  const resetCounter = useCallback(() => {
    // Set current position as the new counter reference point (counter = 0 here)
    if (engineRef.current) {
      setCounterPosition(engineRef.current.position);
    }
  }, []);

  const jumpToCounter = useCallback(() => {
    // Jump to the counter reference point
    seek(counterPosition);
  }, [seek, counterPosition]);

  const rewind = useCallback(() => {
    if (engineRef.current) {
      const currentPos = engineRef.current.position;
      seek(Math.max(0, currentPos - 0.5)); // Spol 0.5 sekunder tilbake per kall
    }
  }, [seek]);

  const fastForward = useCallback(() => {
    if (engineRef.current) {
      const currentPos = engineRef.current.position;
      seek(currentPos + 0.5); // Spol 0.5 sekunder frem per kall (ingen maks-grense)
    }
  }, [seek]);

  const startCueFastForward = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.startCueFastForward();
    }
  }, []);

  const startCueRewind = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.startCueRewind();
    }
  }, []);

  const stopCue = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stopCue();
    }
  }, []);

  const stepBack = useCallback(() => {
    if (engineRef.current) {
      const currentPos = engineRef.current.position;
      seek(Math.max(0, currentPos - 0.1));
    }
  }, [seek]);

  const stepForward = useCallback(() => {
    if (engineRef.current) {
      const currentPos = engineRef.current.position;
      seek(currentPos + 0.1);
    }
  }, [seek]);

  const exportToWAV = useCallback(async () => {
    if (engineRef.current) {
      // Ensure engine has latest tracks before export
      engineRef.current.setTracks(tracks);
      return await engineRef.current.exportToWAV();
    }
    throw new Error('Audio engine ikke tilgjengelig');
  }, [tracks]);

  const updateTracks = useCallback((newTracks: TrackData[]) => {
    // Ensure all tracks have name field
    const tracksWithNames = newTracks.map((track) => ({
      ...track,
      name: track.name ?? '',
    }));
    setTracks(tracksWithNames);
  }, []);

  const setTrackVolume = useCallback((track: TrackNumber, volume: number) => {
    if (engineRef.current) {
      engineRef.current.setTrackVolume(track, volume);
      setTrackVolumes((prev) => {
        const newVolumes = [...prev] as [number, number, number, number];
        newVolumes[track - 1] = volume;
        return newVolumes;
      });
    }
  }, []);

  const toggleTrackLatencyFix = useCallback((track: TrackNumber) => {
    if (engineRef.current) {
      const currentState = engineRef.current.isTrackLatencyFixEnabled(track);
      engineRef.current.setTrackLatencyFix(track, !currentState);
      setTrackLatencyFixState((prev) => {
        const newState = [...prev] as [boolean, boolean, boolean, boolean];
        newState[track - 1] = !currentState;
        return newState;
      });
    }
  }, []);

  const setLatencyFixValue = useCallback((ms: number) => {
    if (engineRef.current) {
      engineRef.current.setLatencyFixValue(ms);
    }
  }, []);

  const getLatencyFixValue = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.getLatencyFixValue();
    }
    return -150; // Default value
  }, []);

  const setTrackName = useCallback((track: TrackNumber, name: string) => {
    setTracks((prev) => {
      const newTracks = prev.map((t) =>
        t.id === track ? { ...t, name } : t
      );
      return newTracks;
    });
  }, []);

  const getAvailableMicrophones = useCallback(async () => {
    if (engineRef.current) {
      return await engineRef.current.getAvailableMicrophones();
    }
    return [];
  }, []);

  const setMicrophone = useCallback((deviceId: string | null) => {
    if (engineRef.current) {
      engineRef.current.setMicrophone(deviceId);
    }
  }, []);

  const getMicrophone = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.getMicrophone();
    }
    return null;
  }, []);

  const getAvailableSpeakers = useCallback(async () => {
    if (engineRef.current) {
      return await engineRef.current.getAvailableSpeakers();
    }
    return [];
  }, []);

  const setSpeaker = useCallback(async (deviceId: string | null) => {
    if (engineRef.current) {
      await engineRef.current.setSpeaker(deviceId);
    }
  }, []);

  const getSpeaker = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.getSpeaker();
    }
    return null;
  }, []);

  return {
    state,
    position,
    counterPosition,
    armedTracks,
    trackLevels,
    trackVolumes,
    trackLatencyFix,
    tracks,
    play,
    stop,
    record,
    seek,
    toggleArmTrack,
    setTrackVolume,
    toggleTrackLatencyFix,
    setLatencyFixValue,
    getLatencyFixValue,
    setTrackName,
    getAvailableMicrophones,
    setMicrophone,
    getMicrophone,
    getAvailableSpeakers,
    setSpeaker,
    getSpeaker,
    resetCounter,
    jumpToCounter,
    rewind,
    fastForward,
    stepBack,
    stepForward,
    exportToWAV,
    updateTracks,
    startCueFastForward,
    startCueRewind,
    stopCue,
  };
}
