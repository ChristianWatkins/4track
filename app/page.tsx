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
    setLatencyFixValue,
    getLatencyFixValue,
    setTrackName,
    getAvailableMicrophones,
    setMicrophone,
    getMicrophone,
    getAvailableSpeakers,
    setSpeaker,
    getSpeaker,
  } = useAudioRecorder();
  
  // Check if any track has audio
  const hasAudio = tracks.some(t => t.audioBuffer !== null && t.duration > 0);

  const [isLoading, setIsLoading] = useState(true);
  const [isRewinding, setIsRewinding] = useState(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [latencyFixValue, setLatencyFixValueState] = useState(-150);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [cassetteTitle, setCassetteTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const project = await loadProject(PROJECT_ID);
        if (project) {
          updateTracks(project.tracks);
          setCassetteTitle(project.cassetteTitle || '');
        } else {
          const emptyProject = createEmptyProject();
          await saveProject(PROJECT_ID, emptyProject);
          updateTracks(emptyProject.tracks);
          setCassetteTitle('');
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
    // Initialize latency fix value
    setLatencyFixValueState(getLatencyFixValue());
    
    // Load available microphones and speakers
    async function loadDevices() {
      try {
        const mics = await getAvailableMicrophones();
        setMicrophones(mics);
        // Set initial microphone if none selected
        if (!getMicrophone() && mics.length > 0) {
          setSelectedMicrophone(mics[0].deviceId);
          setMicrophone(mics[0].deviceId);
        } else {
          setSelectedMicrophone(getMicrophone());
        }

        const spks = await getAvailableSpeakers();
        setSpeakers(spks);
        // Set initial speaker if none selected
        if (!getSpeaker() && spks.length > 0) {
          setSelectedSpeaker(spks[0].deviceId);
          await setSpeaker(spks[0].deviceId);
        } else {
          setSelectedSpeaker(getSpeaker());
        }
      } catch (error) {
        console.error('Error loading devices:', error);
      }
    }
    loadDevices();
  }, [updateTracks, getLatencyFixValue, getAvailableMicrophones, getMicrophone, setMicrophone, getAvailableSpeakers, getSpeaker, setSpeaker]);

  useEffect(() => {
    async function save() {
      if (!isLoading) {
        try {
          const project = {
            tracks,
            counterPosition,
            cassetteTitle,
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
  }, [tracks, counterPosition, cassetteTitle, isLoading]);

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
      setCassetteTitle('');
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

  const handleLatencyFixValueChange = (value: number) => {
    setLatencyFixValueState(value);
    setLatencyFixValue(value);
  };

  const handleMicrophoneChange = (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    setMicrophone(deviceId);
  };

  const handleSpeakerChange = async (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    await setSpeaker(deviceId);
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

        <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] border-2 border-cassette-orange rounded-[15px] p-6 mb-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.6),inset_0_0_30px_rgba(255,165,0,0.05),0_0_30px_rgba(255,165,0,0.4),0_0_60px_rgba(255,165,0,0.2)] relative">
          {isEditingTitle ? (
            <div className="absolute left-1/2 -translate-x-1/2 z-30" style={{ top: 'calc(50% - 60px)' }}>
              <input
                type="text"
                value={cassetteTitle}
                onChange={(e) => setCassetteTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="bg-white border-2 border-cassette-orange text-gray-800 px-3 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-cassette-orange"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '16px', minWidth: '200px' }}
                maxLength={30}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : null}
          <CassetteVisualizer 
            state={state} 
            isRewinding={isRewinding}
            isFastForwarding={isFastForwarding}
            isJumping={isJumping}
            cassetteTitle={cassetteTitle}
            onTitleClick={() => setIsEditingTitle(true)}
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
                latencyFixValue={latencyFixValue}
              />
            );
          })}
        </div>

        {/* Latency Fix Value Configuration */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <label className="text-cassette-orange text-sm font-bold">
            Latency Fix:
          </label>
          <input
            type="number"
            value={latencyFixValue}
            onChange={(e) => handleLatencyFixValueChange(parseInt(e.target.value) || -150)}
            className="bg-black border-2 border-cassette-orange text-cassette-orange px-3 py-2 rounded-lg font-mono text-sm w-24 text-center focus:outline-none focus:ring-2 focus:ring-cassette-orange"
            min="-500"
            max="500"
            step="1"
          />
          <span className="text-gray-400 text-sm">ms</span>
        </div>

        {/* Microphone Selection */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <label className="text-cassette-orange text-sm font-bold">
            Mikrofon:
          </label>
          <select
            value={selectedMicrophone || ''}
            onChange={(e) => handleMicrophoneChange(e.target.value)}
            className="bg-black border-2 border-cassette-orange text-cassette-orange px-3 py-2 rounded-lg text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-cassette-orange"
          >
            {microphones.length === 0 ? (
              <option value="">Ingen mikrofon tilgjengelig</option>
            ) : (
              microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Mikrofon ${mic.deviceId.slice(0, 8)}`}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Speaker Selection */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <label className="text-cassette-orange text-sm font-bold">
            Avspilling:
          </label>
          <select
            value={selectedSpeaker || ''}
            onChange={(e) => handleSpeakerChange(e.target.value)}
            className="bg-black border-2 border-cassette-orange text-cassette-orange px-3 py-2 rounded-lg text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-cassette-orange"
          >
            {speakers.length === 0 ? (
              <option value="">Ingen lydenhet tilgjengelig</option>
            ) : (
              speakers.map((speaker) => (
                <option key={speaker.deviceId} value={speaker.deviceId}>
                  {speaker.label || `Lydenhet ${speaker.deviceId.slice(0, 8)}`}
                </option>
              ))
            )}
          </select>
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
