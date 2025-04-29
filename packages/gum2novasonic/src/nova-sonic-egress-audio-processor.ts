declare class AudioWorkletProcessor {
    constructor();
    readonly port: MessagePort;
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;


class NovaSonicEgressAudioProcessor extends AudioWorkletProcessor {
    // Remove redundant port declaration since it's inherited from parent
    private readonly INT16_MAX = 0x7FFF;
    private readonly INT16_MIN = -0x8000;

    constructor() {
        super();
        // Port is already inherited from parent class, no need to reassign
    }

    process(inputs: Float32Array[][]): boolean {
        // Check if port is initialized before using
        if (!this.port) {
            console.error('Port is not initialized');
            return true;
        }

        const input = inputs[0];
        if (!input?.[0]) return true;

        const inputChannel = input[0];
        const length = inputChannel.length;
        
        const pcmBuffer = new Int16Array(length);
        
        for (let i = 0; i < length; i++) {
            const sample = inputChannel[i];
            if (sample < -1) {
                pcmBuffer[i] = this.INT16_MIN;
            } else if (sample > 1) {
                pcmBuffer[i] = this.INT16_MAX;
            } else {
                pcmBuffer[i] = sample < 0 ? 
                    Math.floor(sample * -this.INT16_MIN) : 
                    Math.floor(sample * this.INT16_MAX);
            }
        }

        this.port.postMessage(pcmBuffer, { transfer: [pcmBuffer.buffer] });
        return true;
    }
}

registerProcessor("nova-sonic-egress-audio-processor", NovaSonicEgressAudioProcessor);
