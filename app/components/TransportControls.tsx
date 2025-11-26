'use client';

import { useState, useRef, useEffect } from 'react';
import { TransportState, TrackNumber } from '@/app/lib/types';

interface TransportControlsProps {
  state: TransportState;
  armedTracks: TrackNumber[];
  hasAudio: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onRewindStart?: () => void;
  onRewindStop?: () => void;
  onFastForwardStart?: () => void;
  onFastForwardStop?: () => void;
  onJumpToZero?: () => void;
  onCueFastForwardStart?: () => void;
  onCueRewindStart?: () => void;
  onCueStop?: () => void;
}

export default function TransportControls({
  state,
  armedTracks,
  hasAudio,
  onPlay,
  onStop,
  onRecord,
  onRewind,
  onFastForward,
  onRewindStart,
  onRewindStop,
  onFastForwardStart,
  onFastForwardStop,
  onJumpToZero,
  onCueFastForwardStart,
  onCueRewindStart,
  onCueStop,
}: TransportControlsProps) {
  const isPlaying = state === 'playing' || state === 'recording';
  const isRecording = state === 'recording';
  const rewindIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fastForwardIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stopClickCountRef = useRef<number>(0);
  const isCueingRef = useRef<boolean>(false);

  const handleRewindMouseDown = () => {
    // If there's audio, use cue mode (play in reverse at high speed)
    if (hasAudio && !isRecording) {
      isCueingRef.current = true;
      onCueRewindStart?.();
    }
    onRewind(); // Initial rewind
    onRewindStart?.();
    rewindIntervalRef.current = setInterval(() => {
      if (!isCueingRef.current) {
        onRewind();
      }
    }, 100); // Spol hver 100ms (only when not cueing)
  };

  const handleRewindMouseUp = () => {
    if (rewindIntervalRef.current) {
      clearInterval(rewindIntervalRef.current);
      rewindIntervalRef.current = null;
    }
    if (isCueingRef.current) {
      onCueStop?.();
      isCueingRef.current = false;
    }
    onRewindStop?.();
  };

  const handleFastForwardMouseDown = () => {
    // If there's audio, use cue mode (play at high speed)
    if (hasAudio && !isRecording) {
      isCueingRef.current = true;
      onCueFastForwardStart?.();
    }
    onFastForward(); // Initial fast forward
    onFastForwardStart?.();
    fastForwardIntervalRef.current = setInterval(() => {
      if (!isCueingRef.current) {
        onFastForward();
      }
    }, 100); // Spol hver 100ms (only when not cueing)
  };

  const handleFastForwardMouseUp = () => {
    if (fastForwardIntervalRef.current) {
      clearInterval(fastForwardIntervalRef.current);
      fastForwardIntervalRef.current = null;
    }
    if (isCueingRef.current) {
      onCueStop?.();
      isCueingRef.current = false;
    }
    onFastForwardStop?.();
  };

  const handleStopClick = () => {
    stopClickCountRef.current += 1;
    
    if (stopClickCountRef.current === 1) {
      // First click - wait for potential second click
      stopClickTimeoutRef.current = setTimeout(() => {
        // Single click - normal stop
        onStop();
        stopClickCountRef.current = 0;
      }, 300); // 300ms window for double-click
    } else if (stopClickCountRef.current === 2) {
      // Double click detected
      if (stopClickTimeoutRef.current) {
        clearTimeout(stopClickTimeoutRef.current);
        stopClickTimeoutRef.current = null;
      }
      onStop();
      onJumpToZero?.(); // Jump to counter position
      stopClickCountRef.current = 0;
    }
  };

  useEffect(() => {
    return () => {
      if (rewindIntervalRef.current) {
        clearInterval(rewindIntervalRef.current);
      }
      if (fastForwardIntervalRef.current) {
        clearInterval(fastForwardIntervalRef.current);
      }
      if (stopClickTimeoutRef.current) {
        clearTimeout(stopClickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center gap-4 my-8">
      <button
        onMouseDown={handleRewindMouseDown}
        onMouseUp={handleRewindMouseUp}
        onMouseLeave={handleRewindMouseUp}
        className="w-[70px] h-[70px] border-[3px] border-cassette-orange rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] text-cassette-orange flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(255,165,0,0.5)] shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
        title="Hold for å spole tilbake"
      >
        <div className="flex items-center gap-0.5">
          <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[12px] border-r-cassette-orange"></div>
          <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[12px] border-r-cassette-orange"></div>
        </div>
      </button>

      <button
        onClick={onPlay}
        className={`w-[70px] h-[70px] border-[3px] border-cassette-orange rounded-full text-2xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(255,165,0,0.5)] shadow-[0_4px_10px_rgba(0,0,0,0.5)] ${
          isPlaying
            ? 'bg-cassette-orange text-black'
            : 'bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] text-cassette-orange'
        }`}
        title="Spill av"
      >
        ▶
      </button>

      <button
        onClick={handleStopClick}
        className="w-[70px] h-[70px] border-[3px] border-cassette-orange rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] text-cassette-orange text-2xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(255,165,0,0.5)] shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
        title="Stopp (dobbeltklikk for å hoppe til 0)"
      >
        ⏹
      </button>

      <button
        onMouseDown={handleFastForwardMouseDown}
        onMouseUp={handleFastForwardMouseUp}
        onMouseLeave={handleFastForwardMouseUp}
        className="w-[70px] h-[70px] border-[3px] border-cassette-orange rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] text-cassette-orange flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(255,165,0,0.5)] shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
        title="Hold for å spole frem"
      >
        <div className="flex items-center gap-0.5">
          <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[12px] border-l-cassette-orange"></div>
          <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[12px] border-l-cassette-orange"></div>
        </div>
      </button>

      <button
        onClick={onRecord}
        className={`w-[70px] h-[70px] border-[3px] rounded-full text-2xl flex items-center justify-center transition-all hover:scale-110 shadow-[0_4px_10px_rgba(0,0,0,0.5)] ${
          isRecording
            ? 'bg-gradient-to-br from-[#dc2626] to-[#991b1b] border-[#dc2626] text-white shadow-[0_0_20px_rgba(255,0,0,0.7)]'
            : armedTracks.length > 0
            ? 'bg-gradient-to-br from-[#8b0000] to-[#660000] border-[#8b0000] text-white hover:bg-gradient-to-br hover:from-[#a00000] hover:to-[#770000] hover:shadow-[0_0_20px_rgba(255,0,0,0.5)]'
            : 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
        }`}
        title={armedTracks.length > 0 ? 'Ta opp på armed sporer' : 'Arm minst ett spor før opptak'}
        disabled={armedTracks.length === 0}
      >
        ●
      </button>
    </div>
  );
}
