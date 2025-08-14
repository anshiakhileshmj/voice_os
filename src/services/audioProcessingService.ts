export class AudioProcessingService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private biquadFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  private onAudioDataCallback: ((audioData: Float32Array) => void) | null = null;
  private isProcessing = false;
  
  // Audio chunking parameters
  private readonly CHUNK_SIZE = 4096;
  private readonly SAMPLE_RATE = 16000;
  private audioBuffer: Float32Array = new Float32Array(0);
  private readonly BUFFER_THRESHOLD = 8192; // Send chunks when buffer reaches this size

  async initialize(onAudioData: (audioData: Float32Array) => void): Promise<void> {
    this.onAudioDataCallback = onAudioData;
    
    try {
      // Request microphone with enhanced audio settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio context with optimal settings
      this.audioContext = new AudioContext({
        sampleRate: this.SAMPLE_RATE,
        latencyHint: 'interactive'
      });

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.setupAudioProcessingChain();
      console.log('Audio processing service initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize audio processing:', error);
      throw error;
    }
  }

  private setupAudioProcessingChain(): void {
    if (!this.audioContext || !this.mediaStream) return;

    // Create audio source
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // Create noise reduction filter (high-pass filter to remove low-frequency noise)
    this.biquadFilter = this.audioContext.createBiquadFilter();
    this.biquadFilter.type = 'highpass';
    this.biquadFilter.frequency.setValueAtTime(80, this.audioContext.currentTime);
    this.biquadFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
    
    // Create compressor for dynamic range control
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
    this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);
    
    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(1.5, this.audioContext.currentTime);
    
    // Create processor for audio chunking
    this.processor = this.audioContext.createScriptProcessor(this.CHUNK_SIZE, 1, 1);
    this.processor.onaudioprocess = this.processAudioChunk.bind(this);
    
    // Connect the audio processing chain
    this.source
      .connect(this.biquadFilter)
      .connect(this.compressor)
      .connect(this.gainNode)
      .connect(this.processor)
      .connect(this.audioContext.destination);
  }

  private processAudioChunk(event: AudioProcessingEvent): void {
    if (!this.isProcessing || !this.onAudioDataCallback) return;

    const inputData = event.inputBuffer.getChannelData(0);
    
    // Apply additional noise reduction
    const processedData = this.applyNoiseReduction(inputData);
    
    // Add to buffer
    const newBuffer = new Float32Array(this.audioBuffer.length + processedData.length);
    newBuffer.set(this.audioBuffer);
    newBuffer.set(processedData, this.audioBuffer.length);
    this.audioBuffer = newBuffer;
    
    // Send chunks when buffer is large enough
    if (this.audioBuffer.length >= this.BUFFER_THRESHOLD) {
      this.onAudioDataCallback(this.audioBuffer.slice());
      this.audioBuffer = new Float32Array(0);
    }
  }

  private applyNoiseReduction(inputData: Float32Array): Float32Array {
    const output = new Float32Array(inputData.length);
    
    // Simple noise gate
    const threshold = 0.01;
    
    for (let i = 0; i < inputData.length; i++) {
      const sample = inputData[i];
      
      // Apply noise gate
      if (Math.abs(sample) < threshold) {
        output[i] = 0;
      } else {
        output[i] = sample;
      }
    }
    
    return output;
  }

  startProcessing(): void {
    this.isProcessing = true;
    console.log('Audio processing started');
  }

  stopProcessing(): void {
    this.isProcessing = false;
    
    // Send any remaining buffer data
    if (this.audioBuffer.length > 0 && this.onAudioDataCallback) {
      this.onAudioDataCallback(this.audioBuffer.slice());
      this.audioBuffer = new Float32Array(0);
    }
    
    console.log('Audio processing stopped');
  }

  cleanup(): void {
    this.stopProcessing();
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('Audio processing service cleaned up');
  }
}

export const audioProcessingService = new AudioProcessingService();
