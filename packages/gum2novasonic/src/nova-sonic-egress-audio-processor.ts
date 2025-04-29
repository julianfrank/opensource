declare class AudioWorkletProcessor {
    constructor();
    readonly port: MessagePort;
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

class NovaSonicEgressAudioProcessor extends AudioWorkletProcessor {
    private readonly INT16_MAX = 0x7FFF;
    private readonly INT16_MIN = -0x8000;
    private readonly TARGET_SAMPLE_RATE = 16000;
    private readonly SOURCE_SAMPLE_RATE = 44100;
    private readonly RATIO = this.SOURCE_SAMPLE_RATE / this.TARGET_SAMPLE_RATE;
    
    // Pre-calculate conversion factors
    private readonly PCM_SCALE_POSITIVE = 0x7FFF;
    private readonly PCM_SCALE_NEGATIVE = -0x8000;
    
    // Pre-allocate resampling buffer with a reasonable size
    private resampleBuffer: Float32Array;
    private pcmBuffer: Int16Array;
    
    constructor() {
        super();
        // Initialize buffers with estimated size (2048 is a common audio buffer size)
        const estimatedResampleSize = Math.ceil(2048 / this.RATIO);
        this.resampleBuffer = new Float32Array(estimatedResampleSize);
        this.pcmBuffer = new Int16Array(estimatedResampleSize);
    }

    private resample(input: Float32Array): Float32Array {
        const newLength = Math.floor(input.length / this.RATIO);
        
        // Resize buffer if needed
        if (this.resampleBuffer.length < newLength) {
            this.resampleBuffer = new Float32Array(newLength);
        }
        
        let outputIndex = 0;
        let position = 0;
        
        // Unrolled loop for better performance
        while (outputIndex < newLength - 1) {
            const index = position | 0; // Faster than Math.floor
            const fraction = position - index;
            const curr = input[index];
            const next = input[index + 1];
            
            this.resampleBuffer[outputIndex] = curr + fraction * (next - curr);
            this.resampleBuffer[outputIndex + 1] = curr + (fraction + this.RATIO) * (next - curr);
            
            position += this.RATIO * 2;
            outputIndex += 2;
        }
        
        // Handle remaining sample if any
        if (outputIndex < newLength) {
            const index = position | 0;
            const fraction = position - index;
            const curr = input[index];
            const next = index + 1 < input.length ? input[index + 1] : curr;
            this.resampleBuffer[outputIndex] = curr + fraction * (next - curr);
        }
        
        return this.resampleBuffer.subarray(0, newLength);
    }

    process(inputs: Float32Array[][]): boolean {
        if (!this.port) return true;

        const input = inputs[0]?.[0];
        if (!input) return true;

        const resampledData = this.resample(input);
        const length = resampledData.length;
        
        // Resize PCM buffer if needed
        if (this.pcmBuffer.length < length) {
            this.pcmBuffer = new Int16Array(length);
        }
        
        // Optimized PCM conversion with SIMD-like batch processing
        for (let i = 0; i < length; i += 4) {
            const batch = Math.min(4, length - i);
            for (let j = 0; j < batch; j++) {
                const sample = resampledData[i + j];
                // Branchless programming for better performance
                const isNegative = sample < 0;
                const clampedSample = sample < -1 ? -1 : sample > 1 ? 1 : sample;
                this.pcmBuffer[i + j] = isNegative ? 
                    (clampedSample * this.PCM_SCALE_NEGATIVE) | 0 : 
                    (clampedSample * this.PCM_SCALE_POSITIVE) | 0;
            }
        }

        this.port.postMessage(this.pcmBuffer.subarray(0, length), {
            transfer: [this.pcmBuffer.buffer]
        });
        
        return true;
    }
}

registerProcessor("nova-sonic-egress-audio-processor", NovaSonicEgressAudioProcessor);
