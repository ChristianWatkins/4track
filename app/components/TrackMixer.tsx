'use client';

import { useState, useRef, useEffect } from 'react';
import { TrackNumber } from '@/app/lib/types';

interface TrackMixerProps {
  trackNumber: TrackNumber;
  level: number; // VU meter level 0-1
  isArmed: boolean;
  onToggleArm: (track: TrackNumber) => void;
  volume?: number; // 0-1
  onVolumeChange?: (track: TrackNumber, volume: number) => void;
  isLatencyFixEnabled?: boolean;
  onToggleLatencyFix?: (track: TrackNumber) => void;
  trackName?: string;
  onTrackNameChange?: (track: TrackNumber, name: string) => void;
}

// Convert dB to linear (0-1) and vice versa
const dbToLinear = (db: number): number => {
  if (db <= -60) return 0;
  return Math.pow(10, db / 20);
};

const linearToDb = (linear: number): number => {
  if (linear === 0) return -60;
  return 20 * Math.log10(linear);
};

// dB scale marks
const dbMarks = [6, 3, 0, -3, -6, -9, -12, -15, -18, -21, -24, -30, -35, -40, -45, -50, -60];

export default function TrackMixer({
  trackNumber,
  level,
  isArmed,
  onToggleArm,
  volume = 1,
  onVolumeChange,
  isLatencyFixEnabled = false,
  onToggleLatencyFix,
  trackName = '',
  onTrackNameChange,
}: TrackMixerProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(trackName);
  const faderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Convert volume (0-1) to dB, then to position
  const volumeDb = linearToDb(volume);
  
  // Convert dB to position (0-1) where 0dB is near top
  // Using 2% to 98% range to keep labels inside the container
  const dbToPosition = (db: number): number => {
    if (db >= 6) return 0.02;
    if (db <= -60) return 0.98;
    const rawPos = (6 - db) / 66; // 6 - (-60) = 66
    return 0.02 + rawPos * 0.96; // Scale to 2%-98% range
  };

  const faderPosition = dbToPosition(volumeDb);
  const faderDisplayDb = volumeDb >= 0 ? `+${volumeDb.toFixed(0)}` : volumeDb.toFixed(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateFaderPosition(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
      updateFaderPosition(e.clientY);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const updateFaderPosition = (clientY: number) => {
    if (!faderRef.current) return;
    const rect = faderRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const position = Math.max(0, Math.min(1, y / rect.height));
    
    // Convert position to dB, then to linear volume
    const db = 6 - (position * 66); // Reverse of dbToPosition
    const newVolume = dbToLinear(db);
    onVolumeChange?.(trackNumber, newVolume);
  };

  useEffect(() => {
    if (isDragging.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging.current]);

  // VU meter segments
  const segments = 20;
  const greenThreshold = 0.6;
  const orangeThreshold = 0.9;

  const getSegmentColor = (segmentIndex: number, currentLevel: number) => {
    const segmentLevel = (segmentIndex + 1) / segments;
    if (segmentLevel > currentLevel) {
      return 'bg-gray-800';
    }
    if (segmentLevel <= greenThreshold) {
      return 'bg-green-500';
    }
    if (segmentLevel <= orangeThreshold) {
      return 'bg-orange-500';
    }
    return 'bg-red-500';
  };

  const levelToDb = (level: number): number => {
    if (level === 0) return -Infinity;
    return 20 * Math.log10(level);
  };

  const dbValue = levelToDb(level);
  const displayDb = isFinite(dbValue) ? dbValue.toFixed(1) : '-∞';

  const handleNameBlur = () => {
    setIsEditingName(false);
    onTrackNameChange?.(trackNumber, editedName);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setEditedName(trackName);
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    setEditedName(trackName);
  }, [trackName]);

  return (
    <div className="flex flex-col items-center w-full bg-[#2a2a2a] border border-[#555] rounded-[4px] max-w-[120px] h-[500px]">
      {/* Track Label */}
      <div 
        className="w-full text-center py-2 text-xs font-bold text-[#ccc] bg-[#1a1a1a] border-b border-[#444] cursor-text hover:bg-[#222] transition-colors"
        onClick={() => setIsEditingName(true)}
        title="Klikk for å redigere navn"
      >
        {isEditingName ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="w-full bg-transparent text-center text-[#ccc] outline-none border-none focus:bg-[#2a2a2a] px-1"
            autoFocus
            maxLength={20}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="truncate px-1">
            {trackName || trackNumber}
          </div>
        )}
      </div>

        {/* dB Scale */}
        <div className="relative flex-1 w-full flex">
          <div className="w-8 text-[10px] text-[#999] font-mono relative pr-1">
            {dbMarks.map((db) => {
              const pos = dbToPosition(db);
              return (
                <div 
                  key={db} 
                  className="absolute right-1 transform -translate-y-1/2"
                  style={{ top: `${pos * 100}%` }}
                >
                  {db >= 0 ? `+${db}` : db}
                </div>
              );
            })}
          </div>

          {/* Fader Track */}
          <div
            ref={faderRef}
            className="flex-1 relative bg-[#1a1a1a] border-x border-[#444] cursor-pointer"
            onMouseDown={handleMouseDown}
          >
            {/* Fader Knob */}
            <div
              className="absolute left-0 right-0 w-full h-4 bg-[#ddd] border border-[#666] rounded-[2px] cursor-grab active:cursor-grabbing shadow-lg z-10"
              style={{
                top: `${faderPosition * 100}%`,
                transform: 'translateY(-50%)',
                background: 'linear-gradient(to bottom, #ddd, #999)',
              }}
            />

            {/* Fader Track Lines */}
            {dbMarks.map((db) => {
              const pos = dbToPosition(db);
              return (
                <div
                  key={db}
                  className="absolute left-0 right-0 h-px bg-[#444]"
                  style={{ top: `${pos * 100}%` }}
                />
              );
            })}
          </div>

          {/* VU Meter */}
          <div className="w-12 flex flex-col items-center py-2">
            <div className="text-[10px] text-[#999] mb-1">0</div>
            <div className="flex-1 w-full bg-black border border-[#555] rounded-[2px] p-1 flex flex-col-reverse gap-0.5 min-h-[200px]">
            {Array.from({ length: segments }).map((_, index) => {
              // index 0 = bottom segment, index 19 = top segment (due to flex-col-reverse)
              // Bottom segments light up first at low volume, going up as volume increases
              return (
                <div
                  key={index}
                  className={`flex-1 rounded-sm transition-colors duration-75 ${
                    getSegmentColor(index, level)
                  }`}
                  style={{ minHeight: '4px' }}
                />
              );
            })}
          </div>
          <div className="text-[10px] text-[#999] mt-1">-∞</div>
        </div>
      </div>

      {/* Fader Value Display */}
      <div className="w-full text-center py-1 text-[10px] text-[#ccc] font-mono bg-[#1a1a1a] border-t border-[#444]">
        {faderDisplayDb}
      </div>

      {/* Arm Button + Latency Fix */}
      <div className="w-full p-2 bg-[#1a1a1a] border-t border-[#444] flex gap-1">
        <button
          onClick={() => onToggleArm(trackNumber)}
          className={`flex-1 py-2 text-xs font-bold uppercase transition-all ${
            isArmed
              ? 'bg-[#dc2626] text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'
              : 'bg-[#555] text-[#ccc] hover:bg-[#666]'
          }`}
        >
          R
        </button>
        <button
          onClick={() => onToggleLatencyFix?.(trackNumber)}
          title="Latency fix (-150ms)"
          className={`w-8 py-2 text-xs transition-all flex items-center justify-center ${
            isLatencyFixEnabled
              ? 'bg-green-600 text-white'
              : 'bg-[#555] text-[#888] hover:bg-[#666]'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}