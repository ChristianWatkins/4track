'use client';

import { useEffect, useState } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { loadProject, saveProject, createEmptyProject, getAllProjects, deleteProject } from './lib/storage';
import { TrackNumber, ProjectData } from './lib/types';
import Counter from './components/Counter';
import CassetteVisualizer from './components/CassetteVisualizer';
import TransportControls from './components/TransportControls';
import TrackMixer from './components/TrackMixer';
import CassetteRack from './components/CassetteRack';
import SaveCassetteButton from './components/SaveCassetteButton';

export default function Home() {
  const {
    state,
    position,
    counterPosition,
    armedTracks,
    trackLevels,
    trackVolumes,
    trackPans,
    tracks,
    play,
    stop,
    record,
    seek,
    toggleArmTrack,
    setTrackVolume,
    setTrackPan,
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
  const [cassetteColor, setCassetteColor] = useState('#ff6b35');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [allCassettes, setAllCassettes] = useState<Array<{ id: string; data: ProjectData }>>([]);

  // Cassette management functions
  const createNewCassette = async () => {
    const newId = `cassette-${Date.now()}`;
    const emptyProject = createEmptyProject();
    await saveProject(newId, emptyProject);
    setCurrentProjectId(newId);
    updateTracks(emptyProject.tracks);
    setCassetteTitle('');
    setCassetteColor(emptyProject.cassetteColor || '#ff6b35');
    await loadAllCassettes();
  };

  const loadCassette = async (id: string) => {
    try {
      const project = await loadProject(id);
      if (project) {
        setCurrentProjectId(id);
        updateTracks(project.tracks);
        setCassetteTitle(project.cassetteTitle || '');
        setCassetteColor(project.cassetteColor || '#ff6b35');
      }
    } catch (error) {
      console.error('Error loading cassette:', error);
    }
  };

  const saveCassette = async () => {
    if (!currentProjectId) return;
    
    const project = {
      tracks,
      counterPosition,
      cassetteTitle,
      cassetteColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveProject(currentProjectId, project);
    // Update the cassette in the list
    setAllCassettes((prev) =>
      prev.map((c) =>
        c.id === currentProjectId
          ? { ...c, data: project }
          : c
      ).sort((a, b) => b.data.updatedAt - a.data.updatedAt)
    );
  };

  const deleteCassette = async (id: string) => {
    try {
      await deleteProject(id);
      await loadAllCassettes();
      
      // If we deleted the current cassette, create a new one
      if (id === currentProjectId) {
        await createNewCassette();
      }
    } catch (error) {
      console.error('Error deleting cassette:', error);
    }
  };

  const renameCassette = async (id: string, newName: string) => {
    try {
      const project = await loadProject(id);
      if (project) {
        project.cassetteTitle = newName;
        project.updatedAt = Date.now();
        await saveProject(id, project);
        
        // If this is the current cassette, update the title
        if (id === currentProjectId) {
          setCassetteTitle(newName);
        }
        
        // Update in local state without full reload
        setAllCassettes((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, data: project }
              : c
          ).sort((a, b) => b.data.updatedAt - a.data.updatedAt)
        );
      }
    } catch (error) {
      console.error('Error renaming cassette:', error);
    }
  };

  // Load all cassettes on mount
  const loadAllCassettes = async () => {
    try {
      const cassettes = await getAllProjects();
      setAllCassettes(cassettes);
      
      // If there are cassettes, load the most recent one
      if (cassettes.length > 0) {
        const mostRecent = cassettes[0];
        setCurrentProjectId(mostRecent.id);
        updateTracks(mostRecent.data.tracks);
        setCassetteTitle(mostRecent.data.cassetteTitle || '');
        setCassetteColor(mostRecent.data.cassetteColor || '#ff6b35');
      } else {
        // Create a default cassette
        await createNewCassette();
      }
    } catch (error) {
      console.error('Error loading cassettes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllCassettes();
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

  // Auto-save current cassette on changes (debounced)
  useEffect(() => {
    if (!isLoading && currentProjectId) {
      const timeoutId = setTimeout(() => {
        const project = {
          tracks,
          counterPosition,
          cassetteTitle,
          cassetteColor,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveProject(currentProjectId, project).then(() => {
          // Update only the current cassette in the list without reloading everything
          setAllCassettes((prev) =>
            prev.map((c) =>
              c.id === currentProjectId
                ? { ...c, data: { ...c.data, cassetteTitle, cassetteColor, updatedAt: Date.now() } }
                : c
            )
          );
        });
      }, 500); // Debounce 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [tracks, counterPosition, cassetteTitle, cassetteColor, isLoading, currentProjectId]);

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
      if (currentProjectId) {
        await saveProject(currentProjectId, emptyProject);
      }
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
    <main className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] flex">
      {/* Cassette Rack */}
      <CassetteRack
        cassettes={allCassettes}
        currentCassetteId={currentProjectId}
        onLoadCassette={loadCassette}
        onDeleteCassette={deleteCassette}
        onRenameCassette={renameCassette}
        onNewCassette={createNewCassette}
      />

      {/* Main content area */}
      <div className="flex-1 ml-80 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center border-b-2 border-cassette-orange pb-4">
            <h1 className="text-[28px] uppercase tracking-[3px] text-cassette-orange font-bold drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]">
              4-Spors Kassettoptaker
            </h1>
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <SaveCassetteButton onSave={saveCassette} />
          </div>

          {/* Cassette Visualizer */}
          <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] border-2 border-cassette-orange rounded-[15px] p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.6),inset_0_0_30px_rgba(255,165,0,0.05),0_0_30px_rgba(255,165,0,0.4),0_0_60px_rgba(255,165,0,0.2)] relative">
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
            cassetteColor={cassetteColor}
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
                pan={trackPans[trackNum - 1]}
                onPanChange={setTrackPan}
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
    </div>
  </main>
  );
}
