import { TrackNumber, TrackData, TransportState } from './types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private tracks: TrackData[] = [];
  private sourceNodes: AudioBufferSourceNode[] = [];
  private gainNodes: GainNode[] = [];
  private analyserNodes: AnalyserNode[] = [];
  private masterGain: GainNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordingStream: MediaStream | null = null;
  private recordingChunks: Blob[] = [];
  private recordingTracks: TrackNumber[] = [];
  private recordingSourceNode: MediaStreamAudioSourceNode | null = null;
  private recordingStartPosition: number = 0; // Position where recording started (for punch-in)
  private trackLatencyFix: [boolean, boolean, boolean, boolean] = [false, false, false, false]; // Per-track latency fix enabled
  private readonly LATENCY_FIX_MS = -150; // Fixed latency compensation in ms
  private monitoringStream: MediaStream | null = null;
  private monitoringSourceNode: MediaStreamAudioSourceNode | null = null;
  private monitoringAnalysers: AnalyserNode[] = [];
  private startTime: number = 0;
  private pausedTime: number = 0;
  private animationFrameId: number | null = null;
  private levelUpdateFrameId: number | null = null;
  private positionIntervalId: ReturnType<typeof setInterval> | null = null;
  private decodedBuffers: (AudioBuffer | null)[] = [null, null, null, null];
  private cueMode: 'forward' | 'reverse' | null = null;
  private cueStartPosition: number = 0;
  private cueStartTime: number = 0;
  private cueIntervalId: ReturnType<typeof setInterval> | null = null;
  private wasPlayingBeforeCue: boolean = false;

  state: TransportState = 'stopped';
  position: number = 0;
  trackVolumes: [number, number, number, number] = [1, 1, 1, 1];
  trackLevels: [number, number, number, number] = [0, 0, 0, 0];
  armedTracks: TrackNumber[] = [];

  private onPositionUpdate?: (position: number) => void;
  private onStateChange?: (state: TransportState) => void;
  private onTracksUpdate?: (tracks: TrackData[]) => void;
  private onLevelsUpdate?: (levels: [number, number, number, number]) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      // Use 'interactive' latencyHint for lowest latency during recording/monitoring
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100,
      });
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  setTracks(tracks: TrackData[]): void {
    // Clear cached decoded buffers when tracks change
    // This ensures cue playback uses fresh audio data
    this.decodedBuffers = [null, null, null, null];
    this.tracks = tracks;
  }

  setOnPositionUpdate(callback: (position: number) => void): void {
    this.onPositionUpdate = callback;
  }

  setOnStateChange(callback: (state: TransportState) => void): void {
    this.onStateChange = callback;
  }

  setOnTracksUpdate(callback: (tracks: TrackData[]) => void): void {
    this.onTracksUpdate = callback;
  }

  setOnLevelsUpdate(callback: (levels: [number, number, number, number]) => void): void {
    this.onLevelsUpdate = callback;
  }

  async toggleArmTrack(track: TrackNumber): Promise<void> {
    const index = this.armedTracks.indexOf(track);
    if (index > -1) {
      // Disarm track
      this.armedTracks.splice(index, 1);
    } else {
      // Arm track
      this.armedTracks.push(track);
    }
    
    // Update monitoring based on armed tracks
    await this.updateMonitoring();
  }

  private async updateMonitoring(): Promise<void> {
    // Stop existing monitoring if no tracks are armed
    if (this.armedTracks.length === 0) {
      this.stopMonitoring();
      return;
    }

    // Start monitoring if not already started
    if (!this.monitoringStream && !this.recordingStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.monitoringStream = stream;
        
        if (this.audioContext) {
          const sourceNode = this.audioContext.createMediaStreamSource(stream);
          this.monitoringSourceNode = sourceNode;
          
          // Create analysers for all 4 tracks
          this.monitoringAnalysers = [];
          for (let i = 0; i < 4; i++) {
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.3; // Lower for faster meter response
            
            // Connect source to analyser (but not to master gain - silent monitoring)
            sourceNode.connect(analyser);
            this.monitoringAnalysers[i] = analyser;
          }
        }
      } catch (error) {
        console.error('Error starting monitoring:', error);
        // Don't alert - monitoring is optional, user can still record
      }
    } else if (this.recordingStream && !this.monitoringStream) {
      // If recording stream exists, use it for monitoring too
      if (this.audioContext && this.recordingSourceNode) {
        // Create analysers for all 4 tracks using recording source
        this.monitoringAnalysers = [];
        for (let i = 0; i < 4; i++) {
          const analyser = this.audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.3; // Lower for faster meter response
          
          // Connect recording source to analyser
          this.recordingSourceNode.connect(analyser);
          this.monitoringAnalysers[i] = analyser;
        }
      }
    }

    // Start level updates if not already running
    if (!this.levelUpdateFrameId) {
      this.updateLevels();
    }
  }

  private stopMonitoring(): void {
    if (this.monitoringSourceNode) {
      this.monitoringSourceNode.disconnect();
      this.monitoringSourceNode = null;
    }
    this.monitoringAnalysers = [];
    if (this.monitoringStream) {
      this.monitoringStream.getTracks().forEach(track => track.stop());
      this.monitoringStream = null;
    }
  }

  isTrackArmed(track: TrackNumber): boolean {
    return this.armedTracks.includes(track);
  }

  setTrackVolume(track: TrackNumber, volume: number): void {
    this.trackVolumes[track - 1] = Math.max(0, Math.min(1, volume));
    if (this.gainNodes[track - 1]) {
      this.gainNodes[track - 1].gain.value = this.trackVolumes[track - 1];
    }
  }

  // Toggle latency fix for a specific track (-150ms offset when enabled)
  setTrackLatencyFix(track: TrackNumber, enabled: boolean): void {
    this.trackLatencyFix[track - 1] = enabled;
    console.log(`Track ${track} latency fix: ${enabled ? 'ON' : 'OFF'} (${enabled ? this.LATENCY_FIX_MS : 0}ms)`);
  }

  isTrackLatencyFixEnabled(track: TrackNumber): boolean {
    return this.trackLatencyFix[track - 1];
  }

  getAllTrackLatencyFix(): [boolean, boolean, boolean, boolean] {
    return [...this.trackLatencyFix] as [boolean, boolean, boolean, boolean];
  }

  async play(): Promise<void> {
    if (!this.audioContext) return;

    // Toggle pause/play if already playing
    if (this.state === 'playing') {
      this.pause();
      return;
    }

    // Ensure AudioContext is running (required for currentTime to work)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.state === 'paused') {
      this.startTime = this.audioContext.currentTime - this.pausedTime;
      this.state = 'playing';
      this.onStateChange?.(this.state);
      this.updatePosition();
      this.updateLevels();
      return;
    }

    this.stopSources();

    const maxDuration = Math.max(...this.tracks.map(t => t.duration));
    
    // Save current position before calculating startTime
    // This ensures we start from the seeked position
    const playFromPosition = this.position;
    
    // Allow playback even without audio data (for recording)
    this.startTime = this.audioContext.currentTime - playFromPosition;
    this.state = 'playing';
    this.onStateChange?.(this.state);
    
    // Immediately update position to confirm we're at the right spot
    this.onPositionUpdate?.(playFromPosition);
    
    if (maxDuration === 0) {
      // No audio data, but start position tracking for recording
      this.updatePosition();
      this.updateLevels();
      return;
    }

    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      const trackNum = (i + 1) as TrackNumber;
      
      // Skip playing tracks that are armed for recording
      if (this.armedTracks.includes(trackNum)) {
        console.log(`Track ${trackNum}: Skipping playback (armed for recording)`);
        continue;
      }
      
      if (!track.audioBuffer) {
        console.log(`Track ${i + 1}: No audio buffer`);
        continue;
      }

      try {
        console.log(`Track ${i + 1}: Decoding audio buffer, size: ${track.audioBuffer.byteLength} bytes`);
        const audioBuffer = await this.audioContext.decodeAudioData(
          track.audioBuffer.slice(0)
        );
        console.log(`Track ${i + 1}: Decoded successfully, duration: ${audioBuffer.duration}s, sampleRate: ${audioBuffer.sampleRate}`);

        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3; // Lower for faster meter response

        source.buffer = audioBuffer;
        gain.gain.value = this.trackVolumes[i];
        console.log(`Track ${i + 1}: Volume: ${this.trackVolumes[i]}`);

        source.connect(gain);
        gain.connect(analyser);
        analyser.connect(this.masterGain!);

        // Apply latency fix if enabled: -150ms = track plays earlier (skip more of buffer)
        const latencyFixMs = this.trackLatencyFix[i] ? this.LATENCY_FIX_MS : 0;
        const latencyFixSec = latencyFixMs / 1000;
        const bufferStartOffset = Math.max(0, this.position - latencyFixSec);
        
        console.log(`Track ${i + 1}: Starting at offset ${bufferStartOffset.toFixed(3)}s${this.trackLatencyFix[i] ? ` (latency fix: ${latencyFixMs}ms)` : ''}`);
        source.start(this.audioContext.currentTime, bufferStartOffset);

        this.sourceNodes.push(source);
        this.gainNodes[i] = gain;
        this.analyserNodes[i] = analyser;

        source.onended = () => {
          console.log(`Track ${i + 1}: Playback ended`);
          if (this.state === 'playing' && i === this.tracks.length - 1) {
            this.stop();
          }
        };
      } catch (error) {
        console.error(`Error playing track ${i + 1}:`, error);
      }
    }

    this.updatePosition();
    this.updateLevels();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.pausedTime = this.position;
    this.stopSources();
    this.state = 'paused';
    this.onStateChange?.(this.state);
  }

  async stop(): Promise<void> {
    // If recording, stop recording first to save the audio
    if (this.state === 'recording') {
      await this.stopRecording();
      // stopRecording() handles state change
      return;
    }
    
    this.stopSources();
    // Stop position tracking when stopped
    if (this.positionIntervalId !== null) {
      clearInterval(this.positionIntervalId);
      this.positionIntervalId = null;
    }
    // Keep current position instead of resetting to 0
    // Only update position if we're actually playing/recording to get final position
    if (this.state === 'playing') {
      if (this.audioContext) {
        this.position = Math.max(0, this.audioContext.currentTime - this.startTime);
      }
      this.onPositionUpdate?.(this.position);
    }
    this.pausedTime = 0;
    this.state = 'stopped';
    this.onStateChange?.(this.state);
  }

  async record(): Promise<void> {
    if (this.state === 'recording') {
      await this.stopRecording();
      return;
    }

    if (this.armedTracks.length === 0) {
      alert('Ingen sporer er armed for opptak. Klikk på ARM-knappen på sporet du vil ta opp på.');
      return;
    }

    if (!this.audioContext) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordingStream = stream;
      this.recordingTracks = [...this.armedTracks];
      this.recordingChunks = [];
      this.recordingStartPosition = this.position; // Save position for punch-in

      // No latency compensation at recording time - use track offset during playback instead

      // Use MediaRecorder API (modern, not deprecated)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      this.mediaRecorder = mediaRecorder;
      
      // Use MediaStreamAudioSourceNode for monitoring
      const sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.recordingSourceNode = sourceNode;
      
      // Connect to master gain for monitoring (optional - can be removed for silent recording)
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0; // Silent monitoring
      sourceNode.connect(gainNode);
      gainNode.connect(this.masterGain!);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordingChunks.push(event.data);
          console.log(`Recording chunk received: ${event.data.size} bytes`);
        }
      };

      // Note: onstop handler is set in stopRecording() to ensure proper track saving

      // Update monitoring to use recording stream
      await this.updateMonitoring();
      
      // Start MediaRecorder
      mediaRecorder.start();
      console.log('MediaRecorder started');
      
      // Start playback if not already playing
      if (this.state !== 'playing') {
        await this.play();
      }

      this.state = 'recording';
      this.onStateChange?.(this.state);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Kunne ikke få tilgang til mikrofonen. Sjekk nettleserinnstillingene.');
    }
  }

  async stopRecording(): Promise<void> {
    console.log('stopRecording called');
    console.log('recordingChunks length:', this.recordingChunks.length);
    console.log('recordingTracks:', this.recordingTracks);
    
    // Save recording tracks before clearing (for onstop callback)
    const tracksToSave = [...this.recordingTracks];
    
    // Stop MediaRecorder and wait for onstop callback to finish processing
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (this.mediaRecorder) {
          const originalOnStop = this.mediaRecorder.onstop;
          this.mediaRecorder.onstop = async (event) => {
            // Process recording with saved tracks
            await this.processRecordingChunks(tracksToSave);
            resolve();
          };
          this.mediaRecorder.stop();
        } else {
          resolve();
        }
      });
    } else {
      // If MediaRecorder already stopped, process chunks directly
      await this.processRecordingChunks(tracksToSave);
    }

    // Disconnect recording nodes
    if (this.recordingSourceNode) {
      this.recordingSourceNode.disconnect();
      this.recordingSourceNode = null;
    }

    // Clean up
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => track.stop());
      this.recordingStream = null;
    }
    this.mediaRecorder = null;
    this.recordingTracks = [];
    // Stop position tracking when stopped
    if (this.positionIntervalId !== null) {
      clearInterval(this.positionIntervalId);
      this.positionIntervalId = null;
    }
    this.state = 'stopped';
    this.onStateChange?.(this.state);
  }

  private async processRecordingChunks(tracksToSave: TrackNumber[]): Promise<void> {
    if (this.recordingChunks.length === 0 || !this.audioContext) {
      console.warn('No recording chunks to process');
      return;
    }

    if (tracksToSave.length === 0) {
      console.warn('No tracks specified for saving recording');
      return;
    }

    try {
      console.log('Processing', this.recordingChunks.length, 'recording chunks for tracks:', tracksToSave);
      console.log('Recording start position:', this.recordingStartPosition);
      
      // Create blob from chunks
      const blob = new Blob(this.recordingChunks, { type: 'audio/webm;codecs=opus' });
      const arrayBuffer = await blob.arrayBuffer();
      console.log('Blob size:', blob.size, 'bytes');
      
      // Decode recording audio data (no latency compensation - use track offset during playback instead)
      const newRecordingBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      console.log('Decoded recording buffer:', {
        duration: newRecordingBuffer.duration,
        sampleRate: newRecordingBuffer.sampleRate,
        numberOfChannels: newRecordingBuffer.numberOfChannels,
        length: newRecordingBuffer.length
      });

      // Save to all specified tracks (with punch-in support)
      const newTracks = [...this.tracks];
      for (const trackNum of tracksToSave) {
        const trackIndex = trackNum - 1;
        const existingTrack = this.tracks[trackIndex];
        
        let finalBuffer: AudioBuffer;
        
        // Check if we need to do punch-in (existing audio and not recording from start)
        if (existingTrack.audioBuffer && this.recordingStartPosition > 0) {
          console.log(`Punch-in recording on track ${trackNum} at position ${this.recordingStartPosition}s`);
          
          // Decode existing audio
          const existingBuffer = await this.audioContext.decodeAudioData(existingTrack.audioBuffer.slice(0));
          console.log('Existing buffer:', {
            duration: existingBuffer.duration,
            sampleRate: existingBuffer.sampleRate,
            length: existingBuffer.length
          });
          
          // Use higher sample rate for quality
          const sampleRate = Math.max(existingBuffer.sampleRate, newRecordingBuffer.sampleRate);
          
          // Calculate sample positions
          const punchInSample = Math.floor(this.recordingStartPosition * sampleRate);
          const existingSamplesBeforePunchIn = Math.min(punchInSample, existingBuffer.length);
          const newRecordingSamples = newRecordingBuffer.length;
          
          // Total length: samples before punch-in + new recording
          const totalLength = existingSamplesBeforePunchIn + newRecordingSamples;
          
          console.log('Punch-in merge:', {
            punchInSample,
            existingSamplesBeforePunchIn,
            newRecordingSamples,
            totalLength
          });
          
          // Create merged buffer
          finalBuffer = this.audioContext.createBuffer(1, totalLength, sampleRate);
          const mergedData = finalBuffer.getChannelData(0);
          
          // Copy existing audio before punch-in point
          const existingData = existingBuffer.getChannelData(0);
          for (let i = 0; i < existingSamplesBeforePunchIn; i++) {
            // Resample if needed
            const srcIndex = Math.floor(i * existingBuffer.sampleRate / sampleRate);
            if (srcIndex < existingData.length) {
              mergedData[i] = existingData[srcIndex];
            }
          }
          
          // Copy new recording after punch-in point
          const newData = newRecordingBuffer.getChannelData(0);
          for (let i = 0; i < newRecordingSamples; i++) {
            // Resample if needed
            const srcIndex = Math.floor(i * newRecordingBuffer.sampleRate / sampleRate);
            if (srcIndex < newData.length) {
              mergedData[existingSamplesBeforePunchIn + i] = newData[srcIndex];
            }
          }
          
          console.log(`Merged audio: ${finalBuffer.duration}s (kept ${existingSamplesBeforePunchIn / sampleRate}s + added ${newRecordingSamples / sampleRate}s)`);
        } else {
          // No existing audio or recording from start - just use new recording
          finalBuffer = newRecordingBuffer;
          console.log(`Full recording on track ${trackNum}, duration: ${finalBuffer.duration}s`);
        }
        
        // Convert merged AudioBuffer to WAV format for storage
        const wavArrayBuffer = this.audioBufferToWav(finalBuffer);
        console.log('WAV buffer size:', wavArrayBuffer.byteLength, 'bytes');

        newTracks[trackIndex] = {
          id: trackNum,
          audioBuffer: wavArrayBuffer,
          duration: finalBuffer.duration,
          sampleRate: finalBuffer.sampleRate,
        };
      }
      this.tracks = newTracks;
      // Clear cached decoded buffers so cue playback uses fresh audio
      this.decodedBuffers = [null, null, null, null];
      this.onTracksUpdate?.(newTracks);
      console.log('Recording saved successfully to tracks:', tracksToSave);
      
      // Clear chunks
      this.recordingChunks = [];
    } catch (error) {
      console.error('Error processing recording:', error);
      alert('Kunne ikke prosessere opptaket. Prøv igjen.');
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const numberOfChannels = buffer.numberOfChannels;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert to 16-bit PCM
    let offset = 44;
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
  }

  seek(position: number): void {
    const wasPlaying = this.state === 'playing';
    const wasRecording = this.state === 'recording';
    
    this.position = Math.max(0, position);
    this.onPositionUpdate?.(this.position);
    
    if (wasPlaying || wasRecording) {
      this.stopSources();
      this.startTime = this.audioContext!.currentTime - this.position;
      
      if (wasPlaying) {
        this.play();
      } else if (wasRecording) {
        // Restart recording if it was recording
        this.record();
      }
    } else {
      // When seeking while stopped, update startTime and position immediately
      // Don't start position tracking - counter should stay stopped
      if (this.audioContext) {
        this.startTime = this.audioContext.currentTime - this.position;
        // Just update position once, don't start continuous tracking
        this.onPositionUpdate?.(this.position);
      }
    }
  }

  // Cue fast forward - play audio at 4x speed
  async startCueFastForward(): Promise<void> {
    if (!this.audioContext || this.state === 'recording') return;
    
    // Stop any existing cue first
    if (this.cueMode) {
      if (this.cueIntervalId) {
        clearInterval(this.cueIntervalId);
        this.cueIntervalId = null;
      }
      this.stopSources();
    }
    
    // Remember if we were playing (only if not already cueing)
    if (!this.cueMode) {
      this.wasPlayingBeforeCue = this.state === 'playing';
    }
    
    // Stop current playback
    this.stopSources();
    
    this.cueMode = 'forward';
    this.cueStartPosition = this.position;
    this.cueStartTime = this.audioContext.currentTime;
    
    // Ensure AudioContext is running
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Start playing at 4x speed
    await this.startCuePlayback(4);
  }

  // Cue rewind - play audio in reverse at 4x speed
  async startCueRewind(): Promise<void> {
    if (!this.audioContext || this.state === 'recording') return;
    
    // Stop any existing cue first
    if (this.cueMode) {
      if (this.cueIntervalId) {
        clearInterval(this.cueIntervalId);
        this.cueIntervalId = null;
      }
      this.stopSources();
    }
    
    // Remember if we were playing (only if not already cueing)
    if (!this.cueMode) {
      this.wasPlayingBeforeCue = this.state === 'playing';
    }
    
    // Stop current playback
    this.stopSources();
    
    this.cueMode = 'reverse';
    this.cueStartPosition = this.position;
    this.cueStartTime = this.audioContext.currentTime;
    
    // Ensure AudioContext is running
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Start reverse playback at 4x speed
    await this.startCuePlayback(-4);
  }

  private async startCuePlayback(rate: number): Promise<void> {
    if (!this.audioContext || !this.masterGain) {
      this.cueMode = null;
      return;
    }
    
    const isReverse = rate < 0;
    const absRate = Math.abs(rate);
    
    // Clear any existing cue interval first
    if (this.cueIntervalId) {
      clearInterval(this.cueIntervalId);
      this.cueIntervalId = null;
    }
    
    // Decode and cache audio buffers
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      if (track.audioBuffer && !this.decodedBuffers[i]) {
        try {
          this.decodedBuffers[i] = await this.audioContext.decodeAudioData(track.audioBuffer.slice(0));
        } catch (error) {
          console.error(`Error decoding track ${i + 1} for cue:`, error);
          this.decodedBuffers[i] = null;
        }
      }
    }
    
    // Check if we have any buffers to play
    const hasBuffersToPlay = this.decodedBuffers.some((buffer, i) => {
      const trackNum = (i + 1) as TrackNumber;
      return buffer !== null && !this.armedTracks.includes(trackNum);
    });
    
    if (!hasBuffersToPlay) {
      console.log('No audio buffers available for cue playback');
      this.cueMode = null;
      return;
    }
    
    // Create playback for each track
    for (let i = 0; i < this.tracks.length; i++) {
      const trackNum = (i + 1) as TrackNumber;
      
      // Skip armed tracks
      if (this.armedTracks.includes(trackNum)) continue;
      
      const buffer = this.decodedBuffers[i];
      if (!buffer) continue;
      
      try {
        let playBuffer = buffer;
        
        // For reverse, create a reversed buffer
        if (isReverse) {
          playBuffer = this.audioContext.createBuffer(
            buffer.numberOfChannels,
            buffer.length,
            buffer.sampleRate
          );
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const originalData = buffer.getChannelData(channel);
            const reversedData = playBuffer.getChannelData(channel);
            for (let j = 0; j < buffer.length; j++) {
              reversedData[j] = originalData[buffer.length - 1 - j];
            }
          }
        }
        
        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3; // Lower for faster meter response
        
        source.buffer = playBuffer;
        source.playbackRate.value = absRate;
        gain.gain.value = this.trackVolumes[i] * 0.5; // Reduce volume during cue
        
        source.connect(gain);
        gain.connect(analyser);
        analyser.connect(this.masterGain);
        
        // Calculate start offset
        let startOffset: number;
        if (isReverse) {
          // For reverse, start from the end minus current position
          startOffset = Math.max(0, buffer.duration - this.position);
        } else {
          startOffset = Math.min(this.position, buffer.duration);
        }
        
        source.start(0, startOffset);
        
        this.sourceNodes.push(source);
        this.gainNodes[i] = gain;
        this.analyserNodes[i] = analyser;
      } catch (error) {
        console.error(`Error starting cue playback for track ${i + 1}:`, error);
      }
    }
    
    // Update position during cue
    this.cueIntervalId = setInterval(() => {
      if (!this.audioContext || !this.cueMode) {
        if (this.cueIntervalId) {
          clearInterval(this.cueIntervalId);
          this.cueIntervalId = null;
        }
        return;
      }
      
      const elapsed = this.audioContext.currentTime - this.cueStartTime;
      const positionChange = elapsed * absRate;
      
      if (isReverse) {
        this.position = Math.max(0, this.cueStartPosition - positionChange);
        if (this.position <= 0) {
          this.stopCue();
          return;
        }
      } else {
        this.position = this.cueStartPosition + positionChange;
      }
      
      this.onPositionUpdate?.(this.position);
    }, 50);
    
    this.updateLevels();
  }

  stopCue(): void {
    if (!this.cueMode) return;
    
    // Stop cue interval
    if (this.cueIntervalId) {
      clearInterval(this.cueIntervalId);
      this.cueIntervalId = null;
    }
    
    // Stop sources
    this.stopSources();
    
    this.cueMode = null;
    
    // Update startTime to current position
    if (this.audioContext) {
      this.startTime = this.audioContext.currentTime - this.position;
    }
    
    // Always stop at current position after cueing (like a real tape deck)
    this.state = 'stopped';
    this.onStateChange?.(this.state);
    this.wasPlayingBeforeCue = false;
  }

  isCueing(): boolean {
    return this.cueMode !== null;
  }

  private stopSources(): void {
    this.sourceNodes.forEach(node => {
      try {
        node.stop();
      } catch (e) {
        // Node might already be stopped
      }
    });
    this.sourceNodes = [];
    this.gainNodes = [];
    this.analyserNodes = [];
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.positionIntervalId !== null) {
      clearInterval(this.positionIntervalId);
      this.positionIntervalId = null;
    }
    if (this.levelUpdateFrameId !== null) {
      cancelAnimationFrame(this.levelUpdateFrameId);
      this.levelUpdateFrameId = null;
    }
    // Reset levels when stopped
    this.trackLevels = [0, 0, 0, 0];
    this.onLevelsUpdate?.(this.trackLevels);
  }

  private updatePosition(): void {
    if (!this.audioContext) return;

    // Clear any existing interval
    if (this.positionIntervalId !== null) {
      clearInterval(this.positionIntervalId);
      this.positionIntervalId = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const maxDuration = Math.max(...this.tracks.map(t => t.duration));
    
    // Use setInterval for more reliable continuous updates
    // Update every 50ms for responsive counter display (reduced from 100ms)
    this.positionIntervalId = setInterval(() => {
      if (this.audioContext) {
        // Update position based on current time and startTime
        // This works for playing, recording, and even when stopped (for rewinding)
        const newPosition = Math.max(0, this.audioContext.currentTime - this.startTime);
        
        // Only update if playing/recording, or if position changed (for rewinding)
        if (this.state === 'playing' || this.state === 'recording') {
          this.position = newPosition;
          
          // Only stop if we have audio data and reached the end (and not recording)
          // If no audio data (maxDuration === 0), let counter run indefinitely
          if (this.state === 'playing' && maxDuration > 0 && this.position >= maxDuration) {
            this.stop();
            return;
          }
          
          this.onPositionUpdate?.(this.position);
        } else {
          // When stopped, only update if position actually changed (during rewinding)
          // This prevents unnecessary updates when not seeking
          if (Math.abs(newPosition - this.position) > 0.01) {
            this.position = newPosition;
            this.onPositionUpdate?.(this.position);
          }
        }
      } else {
        // Stop interval if audioContext is gone
        if (this.positionIntervalId !== null) {
          clearInterval(this.positionIntervalId);
          this.positionIntervalId = null;
        }
      }
    }, 50); // Update every 50ms for lower latency
  }

  private updateLevels(): void {
    if (!this.audioContext) return;

    const update = () => {
      const newLevels: [number, number, number, number] = [0, 0, 0, 0];
      
      // Update levels for playing/recording tracks
      if (this.state === 'playing' || this.state === 'recording') {
        for (let i = 0; i < this.analyserNodes.length; i++) {
          const analyser = this.analyserNodes[i];
          if (analyser) {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(dataArray);
            
            // Calculate RMS (Root Mean Square) for level
            let sum = 0;
            for (let j = 0; j < dataArray.length; j++) {
              const normalized = (dataArray[j] - 128) / 128;
              sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            newLevels[i] = Math.min(1, rms * 2); // Scale and clamp
          }
        }
      }
      
      // Update levels for armed tracks (live monitoring)
      if (this.monitoringAnalysers.length > 0) {
        for (let i = 0; i < 4; i++) {
          const trackNum = (i + 1) as TrackNumber;
          const isArmed = this.armedTracks.includes(trackNum);
          
          if (isArmed && this.monitoringAnalysers[i]) {
            const analyser = this.monitoringAnalysers[i];
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(dataArray);
            
            // Calculate RMS (Root Mean Square) for level
            let sum = 0;
            for (let j = 0; j < dataArray.length; j++) {
              const normalized = (dataArray[j] - 128) / 128;
              sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const level = Math.min(1, rms * 2); // Scale and clamp
            
            // Use monitoring level if higher than playback level, or if not playing
            if (this.state !== 'playing' && this.state !== 'recording' || level > newLevels[i]) {
              newLevels[i] = level;
            }
          }
        }
      }
      
      this.trackLevels = newLevels;
      this.onLevelsUpdate?.(newLevels);
      
      // Continue updating if monitoring or playing/recording
      if (this.state === 'playing' || this.state === 'recording' || this.armedTracks.length > 0) {
        this.levelUpdateFrameId = requestAnimationFrame(update);
      } else {
        this.levelUpdateFrameId = null;
      }
    };

    this.levelUpdateFrameId = requestAnimationFrame(update);
  }

  async exportToWAV(): Promise<Blob> {
    const trackInfo = this.tracks.map(t => 
      `Spor ${t.id}: ${t.duration}s, buffer: ${t.audioBuffer ? t.audioBuffer.byteLength + ' bytes' : 'null'}`
    ).join('; ');
    console.log('Export: tracks data:', trackInfo);
    
    const maxDuration = Math.max(...this.tracks.map(t => t.duration), 0);
    if (maxDuration === 0) {
      throw new Error('Ingen lyddata å eksportere. ' + trackInfo);
    }

    // Use the highest sample rate from all tracks, default to 44100
    const sampleRate = Math.max(...this.tracks.map(t => t.sampleRate || 44100), 44100);
    const length = Math.floor(maxDuration * sampleRate);
    const numberOfChannels = 2;
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Mix all tracks
    const audioBuffers: AudioBuffer[] = [];
    for (const track of this.tracks) {
      if (track.audioBuffer) {
        try {
          const audioBuffer = await this.audioContext!.decodeAudioData(track.audioBuffer.slice(0));
          audioBuffers.push(audioBuffer);
        } catch (error) {
          console.error(`Error decoding track ${track.id}:`, error);
        }
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error('Ingen gyldig lyddata å eksportere');
    }

    // Mix tracks with volumes
    const mixedData = new Float32Array(length * numberOfChannels);
    for (let i = 0; i < audioBuffers.length; i++) {
      const trackBuffer = audioBuffers[i];
      const volume = this.trackVolumes[i];
      const trackData = trackBuffer.getChannelData(0);
      const trackLength = Math.min(length, Math.floor(trackBuffer.duration * sampleRate));
      
      for (let j = 0; j < trackLength; j++) {
        const sample = trackData[j] * volume;
        // Normalize to prevent clipping
        const normalizedSample = Math.max(-1, Math.min(1, sample));
        mixedData[j * numberOfChannels] += normalizedSample;
        mixedData[j * numberOfChannels + 1] += normalizedSample;
      }
    }

    // Normalize final mix to prevent clipping
    // Use loop instead of spread to avoid stack overflow with large arrays
    let maxSample = 0;
    for (let i = 0; i < mixedData.length; i++) {
      const absVal = Math.abs(mixedData[i]);
      if (absVal > maxSample) maxSample = absVal;
    }
    const normalizeFactor = maxSample > 1 ? 1 / maxSample : 1;

    // Convert to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < mixedData.length; i++) {
      const sample = Math.max(-1, Math.min(1, mixedData[i] * normalizeFactor));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  dispose(): void {
    this.stop();
    this.stopSources();
    this.stopMonitoring();
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
