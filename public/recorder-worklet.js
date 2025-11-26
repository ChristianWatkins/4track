// AudioWorklet processor for sample-precise recording
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffers = [];
    this.isRecording = false;
    this.recordingStartTime = 0;
    
    this.port.onmessage = (event) => {
      if (event.data.command === 'start') {
        this.buffers = [];
        this.isRecording = true;
        this.recordingStartTime = currentTime;
        this.port.postMessage({ 
          type: 'started',
          startTime: this.recordingStartTime 
        });
      } else if (event.data.command === 'stop') {
        this.isRecording = false;
        
        // Send recorded data back
        this.port.postMessage({ 
          type: 'data',
          buffers: this.buffers,
          sampleRate: sampleRate,
          recordingStartTime: this.recordingStartTime,
          recordingEndTime: currentTime
        });
        
        this.buffers = [];
      }
    };
  }
  
  process(inputs, outputs, parameters) {
    if (this.isRecording && inputs[0] && inputs[0].length > 0) {
      // Copy input samples for each channel
      const channelData = [];
      for (let channel = 0; channel < inputs[0].length; channel++) {
        if (inputs[0][channel]) {
          // Create a copy of the input data
          channelData.push(new Float32Array(inputs[0][channel]));
        }
      }
      
      if (channelData.length > 0) {
        this.buffers.push(channelData);
      }
    }
    
    // Keep processor alive
    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);

