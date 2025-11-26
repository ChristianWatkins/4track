'use client';

import { useEffect, useState } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { loadProject, saveProject, createEmptyProject } from './lib/storage';
import { TrackNumber } from './lib/types';
import Counter from './components/Counter';
import CassetteVisualizer from './components/CassetteVisualizer';
import TransportControls from './components/TransportControls';
import TrackMixer from './components/TrackMixer';

const PROJECT_ID = 'default-project';

export default function Home() {
  const {
    state,
    position,
    counterPosition,
    armedTracks,
    trackLevels,
    trackVolumes,
    tracks,
    play,
    stop,
    record,
    seek,
    toggleArmTrack,
    setTrackVolume,
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
    trackLatencyFix,
    toggleTrackLatencyFix,
    setTrackName,
  } = useAudioRecorder();
  
  // Check if any track has audio
  const hasAudio = tracks.some(t => t.audioBuffer !== null && t.duration > 0);

  const [isLoading, setIsLoading] = useState(true);
  const [isRewinding, setIsRewinding] = useState(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const project = await loadProject(PROJECT_ID);
        if (project) {
          updateTracks(project.tracks);
        } else {
          const emptyProject = createEmptyProject();
          await saveProject(PROJECT_ID, emptyProject);
          updateTracks(emptyProject.tracks);
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [updateTracks]);

  useEffect(() => {
    async function save() {
      if (!isLoading) {
        try {
          const project = {
            tracks,
            counterPosition,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await saveProject(PROJECT_ID, project);
        } catch (error) {
          console.error('Error saving project:', error);
        }
      }
    }
    save();
  }, [tracks, counterPosition, isLoading]);

  const handleExport = async () => {
    try {
      const trackInfo = tracks.map(t => 
        `Spor ${t.id}: ${t.duration}s, buffer: ${t.audioBuffer ? t.audioBuffer.byteLength + ' bytes' : 'null'}`
      ).join('; ');
      console.log('Eksporterer... Spor-data:', trackInfo);
      const blob = await exportToWAV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `4track-export-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ukjent feil';
      alert(`Kunne ikke eksportere: ${errorMessage}`);
    }
  };

  const handleReset = async () => {
    if (confirm('Er du sikker på at du vil slette alle opptak? Dette kan ikke angres.')) {
      await stop();
      const emptyProject = createEmptyProject();
      updateTracks(emptyProject.tracks);
      seek(0);
      await saveProject(PROJECT_ID, emptyProject);
    }
  };

  // Trigger jumping animation and then jump to position
  const handleJumpWithAnimation = () => {
    setIsJumping(true);
    jumpToCounter();
    // Stop animation after 300ms
    setTimeout(() => setIsJumping(false), 300);
  };

  // Trigger jumping animation for double-click stop (jump to counter position)
  const handleJumpToCounterWithAnimation = () => {
    setIsJumping(true);
    jumpToCounter();
    // Stop animation after 300ms
    setTimeout(() => setIsJumping(false), 300);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cassette-dark to-gray-800">
        <div className="text-cassette-orange text-xl">Laster...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}>
      <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] border-[3px] border-cassette-orange rounded-[20px] p-8 max-w-[900px] w-full shadow-[0_10px_40px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,165,0,0.1)]">
        <div className="text-center mb-8 border-b-2 border-cassette-orange pb-4">
          <h1 className="text-[28px] uppercase tracking-[3px] text-cassette-orange font-bold drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]">
            4-Spors Kassettoptaker
          </h1>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-cassette-orange rounded-[15px] p-6 mb-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.6),inset_0_0_30px_rgba(255,165,0,0.05)]">
          <CassetteVisualizer 
            state={state} 
            isRewinding={isRewinding}
            isFastForwarding={isFastForwarding}
            isJumping={isJumping}
          />
        </div>

        <Counter
          position={position}
          counterPosition={counterPosition}
          onReset={resetCounter}
        />

        <TransportControls
          state={state}
          armedTracks={armedTracks}
          hasAudio={hasAudio}
          onPlay={play}
          onStop={stop}
          onRecord={record}
          onRewind={rewind}
          onFastForward={fastForward}
          onRewindStart={() => setIsRewinding(true)}
          onRewindStop={() => setIsRewinding(false)}
          onFastForwardStart={() => setIsFastForwarding(true)}
          onFastForwardStop={() => setIsFastForwarding(false)}
          onJumpToZero={handleJumpToCounterWithAnimation}
          onCueFastForwardStart={startCueFastForward}
          onCueRewindStart={startCueRewind}
          onCueStop={stopCue}
        />

        <div className="mt-8 flex gap-2 justify-center">
          {([1, 2, 3, 4] as TrackNumber[]).map((trackNum) => {
            const track = tracks.find(t => t.id === trackNum);
            return (
              <TrackMixer
                key={trackNum}
                trackNumber={trackNum}
                level={trackLevels[trackNum - 1]}
                isArmed={armedTracks.includes(trackNum)}
                onToggleArm={toggleArmTrack}
                volume={trackVolumes[trackNum - 1]}
                onVolumeChange={setTrackVolume}
                isLatencyFixEnabled={trackLatencyFix[trackNum - 1]}
                onToggleLatencyFix={toggleTrackLatencyFix}
                trackName={track?.name || ''}
                onTrackNameChange={setTrackName}
              />
            );
          })}
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={handleExport}
            className="bg-cassette-orange text-black px-6 py-3 rounded-lg font-bold uppercase transition-all hover:bg-orange-600 hover:scale-105"
          >
            Eksporter til WAV
          </button>
          <button
            onClick={handleReset}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold uppercase transition-all hover:bg-red-700 hover:scale-105"
          >
            Slett Alt
          </button>
        </div>
      </div>
    </main>
  );
}
