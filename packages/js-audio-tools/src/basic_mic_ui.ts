import "./basic_mic_ui.css";

interface Microphone {
    deviceId: string;
    label: string;
}

interface StreamTarget {
    // Required methods that a stream target must implement
    setStream(stream: MediaStream | null): void;
    start?(): void;
    stop?(): void;
    // Event handlers that will be called by MicManager
    onStreamStart?: () => void;
    onStreamStop?: () => void;
    onStreamError?: (error: Error) => void;
}

interface WaveformConfig {
    enabled?: boolean;
    width?: number;
    height?: number;
    resolution?: number;
    refreshRate?: number;
    backgroundColor?: string;
    waveformColor?: string;
}

type MicUIParameters = {
    rootElement?: HTMLElement;
    streamTarget?: StreamTarget;
    onMicListChange?: (microphones: Microphone[]) => void;
    onStartRecording?: (stream: MediaStream) => void;
    onStopRecording?: () => void;
    onAudioElementChange?: (audioElement: HTMLAudioElement) => void;
    onAudioElementError?: (error: Error) => void;
    startButtonText?: string;
    stopButtonText?: string;
    waveform?: WaveformConfig;
};

type MicUIElements = {
    micWidget: HTMLDivElement;
    micSettingsContainer: HTMLDivElement;
    settingsButton: HTMLDivElement;
    micList: HTMLSelectElement;
    startButton: HTMLDivElement;
    stopButton: HTMLDivElement;
    audioElement: HTMLAudioElement;
    waveformCanvas?: HTMLCanvasElement;
    waveformContainer?: HTMLDivElement;
};

// Custom error types for better error handling
class MicManagerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MicManagerError";
    }
}

class StreamError extends MicManagerError {
    constructor(message: string) {
        super(message);
        this.name = "StreamError";
    }
}

class DeviceError extends MicManagerError {
    constructor(message: string) {
        super(message);
        this.name = "DeviceError";
    }
}

export class MicManager {
    private stream: MediaStream | null = null;
    private rootElement: HTMLElement;
    private static _instanceCreated = false;
    private elements: MicUIElements | null = null;
    private startButton: HTMLDivElement | null = null;
    private stopButton: HTMLDivElement | null = null;
    private streamTarget: StreamTarget | null = null;
    private useDefaultAudioElement: boolean = true;
    private eventListeners: Map<
        HTMLElement,
        { type: string; listener: EventListener }[]
    > = new Map();
    private micListCache: Microphone[] | null = null;
    private micListCacheTimestamp: number = 0;
    private readonly MIC_LIST_CACHE_DURATION = 5000; // Cache duration in milliseconds

    // Waveform visualization properties
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private waveformConfig: WaveformConfig = {
        enabled: true,
        width: 300,
        height: 150,
        resolution: 128,
        refreshRate: 60,
        backgroundColor: '#000000',
        waveformColor: '#00ff00'
    };
    private animationFrameId: number | null = null;

    constructor(params: MicUIParameters) {
        if (MicManager._instanceCreated) {
            throw new MicManagerError("MicManager instance already created");
        }
        MicManager._instanceCreated = true;
        this.rootElement = params?.rootElement || document.body;

        if (params.streamTarget) {
            this.setStreamTarget(params.streamTarget);
        }
    }

    /**
     * Safely adds an event listener and stores it for cleanup
     * @param element The DOM element to attach the listener to
     * @param type Event type
     * @param listener Event listener function
     */
    private addEventListenerWithCleanup(
        element: HTMLElement,
        type: string,
        listener: EventListener,
    ): void {
        element.addEventListener(type, listener);
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }
        this.eventListeners.get(element)?.push({ type, listener });
    }

    /**
     * Removes all event listeners from an element
     * @param element The DOM element to clean up
     */
    private removeEventListeners(element: HTMLElement): void {
        const listeners = this.eventListeners.get(element);
        if (listeners) {
            listeners.forEach(({ type, listener }) => {
                element.removeEventListener(type, listener);
            });
            this.eventListeners.delete(element);
        }
    }

    /**
     * Sets a custom stream target for audio output
     * @param target The stream target implementation
     */
    setStreamTarget(target: StreamTarget): void {
        if (this.stream) {
            this.stopRecording();
        }

        this.streamTarget = target;
        this.useDefaultAudioElement = false;

        if (this.elements) {
            this.elements.audioElement.style.display = "none";
        }
    }

    /**
     * Removes the custom stream target and reverts to using the default audio element
     */
    clearStreamTarget(): void {
        if (this.stream) {
            this.stopRecording();
        }

        this.streamTarget = null;
        this.useDefaultAudioElement = true;

        if (this.elements) {
            this.elements.audioElement.style.display = "block";
        }
    }

    /**
     * Gets the list of available microphones, using cache when possible
     * @returns Promise<Microphone[]>
     */
    async getMicrophoneList(): Promise<Microphone[]> {
        // Check if we have a valid cached list
        const now = Date.now();
        if (
            this.micListCache &&
            (now - this.micListCacheTimestamp) < this.MIC_LIST_CACHE_DURATION
        ) {
            return this.micListCache;
        }

        if (!navigator.mediaDevices) {
            throw new DeviceError("MediaDevices API not supported");
        }

        try {
            // Request permission first with optimal audio settings
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const microphones = devices
                .filter((device) => device.kind === "audioinput")
                .map((device) => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone (${device.deviceId})`,
                }));

            // Update cache
            this.micListCache = microphones;
            this.micListCacheTimestamp = now;

            return microphones;
        } catch (error) {
            console.error("Error getting microphone list:", error);
            throw error instanceof Error
                ? new DeviceError(error.message)
                : new DeviceError("Failed to get microphone list");
        }
    }

    private updateMicList(
        micList: HTMLSelectElement,
        microphones: Microphone[],
    ): void {
        // Clear existing options
        while (micList.firstChild) {
            micList.removeChild(micList.firstChild);
        }

        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();
        microphones.forEach((mic) => {
            const option = document.createElement("option");
            option.value = mic.deviceId;
            option.text = mic.label;
            fragment.appendChild(option);
        });
        micList.appendChild(fragment);
    }

    createMicUI(params: MicUIParameters): MicUIElements {
        const {
            rootElement = this.rootElement,
            startButtonText = "🎙️",
            stopButtonText = "🛑",
            onStartRecording,
            onStopRecording,
            onAudioElementError,
            streamTarget,
            waveform,
        } = params;

        // Update streamTarget if provided
        if (streamTarget) {
            this.setStreamTarget(streamTarget);
        }

        // Update waveform configuration if provided
        if (waveform) {
            this.waveformConfig = {
                ...this.waveformConfig,
                ...waveform
            };
        }

        const micWidget = document.createElement("div");
        micWidget.classList.add("mic-widget");
        rootElement.appendChild(micWidget);

        // Create a container for the mic list and settings button
        const micSettingsContainer = document.createElement("div");
        micSettingsContainer.classList.add("mic-settings-container");
        micWidget.appendChild(micSettingsContainer);

        // Create settings button
        const settingsButton = document.createElement("div");
        settingsButton.classList.add("settings-button");
        settingsButton.textContent = "⚙️";
        settingsButton.setAttribute("role", "button");
        settingsButton.setAttribute("tabindex", "0");
        micSettingsContainer.appendChild(settingsButton);

        const micList = document.createElement("select");
        micList.classList.add("mic-list");
        micList.classList.add("mic-list-hidden"); // Add hidden by default
        micSettingsContainer.appendChild(micList);

        // Add click handler for settings button
        this.addEventListenerWithCleanup(settingsButton, "click", () => {
            micList.classList.toggle("mic-list-hidden");
        });

        const startButton = document.createElement("div");
        startButton.classList.add("start-button");
        startButton.textContent = startButtonText;
        startButton.setAttribute("role", "button");
        startButton.setAttribute("tabindex", "0");
        micWidget.appendChild(startButton);
        this.startButton = startButton;

        const stopButton = document.createElement("div");
        stopButton.classList.add("stop-button");
        stopButton.textContent = stopButtonText;
        stopButton.setAttribute("role", "button");
        stopButton.setAttribute("tabindex", "0");
        micWidget.appendChild(stopButton);
        this.stopButton = stopButton;

        const audioElement = document.createElement("audio");
        audioElement.classList.add("audio-element");
        // Hide audio element if using custom stream target
        if (!this.useDefaultAudioElement) {
            audioElement.style.display = "none";
        }
        micWidget.appendChild(audioElement);

        // Create waveform container and canvas if enabled
        let waveformCanvas: HTMLCanvasElement | undefined;
        let waveformContainer: HTMLDivElement | undefined;
        
        if (this.waveformConfig.enabled) {
            waveformContainer = document.createElement("div");
            waveformContainer.classList.add("waveform-container", "hidden");
            micWidget.appendChild(waveformContainer);

            waveformCanvas = document.createElement("canvas");
            waveformCanvas.classList.add("waveform-canvas");
            waveformCanvas.width = this.waveformConfig.width || 300;
            waveformCanvas.height = this.waveformConfig.height || 150;
            waveformContainer.appendChild(waveformCanvas);
        }

        // Event Listeners with cleanup registration
        this.addEventListenerWithCleanup(
            micList,
            "change",
            this.handleMicChange.bind(this),
        );

        this.addEventListenerWithCleanup(startButton, "click", async () => {
            try {
                await this.startRecording(micList.value);
                onStartRecording?.(this.stream!);

                // Set up waveform if enabled
                if (this.waveformConfig.enabled && this.stream) {
                    this.setupWaveform(this.stream);
                }

                //Update UI Buttons
                startButton.style.display = "none";
                stopButton.style.display = "block";
            } catch (error) {
                console.error("Error starting recording:", error);
                const streamError = error instanceof Error
                    ? new StreamError(error.message)
                    : new StreamError("Failed to start recording");
                onAudioElementError?.(streamError);
            }
        });

        this.addEventListenerWithCleanup(stopButton, "click", () => {
            this.stopRecording();
            onStopRecording?.();
            //Update UI Buttons
            startButton.style.display = "block";
            stopButton.style.display = "none";
        });

        // Initialize microphone list with error handling
        this.getMicrophoneList()
            .then((mics) => {
                this.updateMicList(micList, mics);
                params.onMicListChange?.(mics);
            })
            .catch((error) => {
                const deviceError = error instanceof Error
                    ? new DeviceError(error.message)
                    : new DeviceError("Failed to initialize microphone list");
                params.onAudioElementError?.(deviceError);
            });

        this.elements = {
            micWidget,
            micSettingsContainer,
            settingsButton,
            micList,
            startButton,
            stopButton,
            audioElement,
            waveformCanvas,
            waveformContainer
        };
        return this.elements;
    }

    private async handleMicChange(): Promise<void> {
        if (this.stream) {
            this.stopRecording();
            //Update UI Buttons
            if (this.startButton && this.stopButton) {
                this.startButton.style.display = "block";
                this.stopButton.style.display = "none";
            }
        }
    }

    private async startRecording(deviceId: string): Promise<void> {
        if (this.stream) {
            this.stopRecording();
        }

        const constraints: MediaStreamConstraints = {
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        };

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(
                constraints,
            );

            if (this.stream) {
                // Handle stream routing based on target
                if (this.streamTarget) {
                    this.streamTarget.setStream(this.stream);
                    this.streamTarget.start?.();
                    this.streamTarget.onStreamStart?.();
                } else if (this.useDefaultAudioElement && this.elements) {
                    this.elements.audioElement.srcObject = this.stream;
                    await this.elements.audioElement.play();
                }
            }
        } catch (error) {
            console.error("Error starting recording:", error);
            const streamError = error instanceof Error
                ? new StreamError(error.message)
                : new StreamError("Failed to start recording");

            if (this.streamTarget) {
                this.streamTarget.onStreamError?.(streamError);
            }
            throw streamError;
        }
    }

    private stopRecording(): void {
        if (this.stream) {
            try {
                // Stop waveform visualization if active
                this.stopWaveform();

                // Stop all tracks
                this.stream.getTracks().forEach((track) => {
                    try {
                        track.stop();
                    } catch (error) {
                        console.warn("Error stopping track:", error);
                    }
                });

                // Handle stream cleanup based on target
                if (this.streamTarget) {
                    this.streamTarget.setStream(null);
                    this.streamTarget.stop?.();
                    this.streamTarget.onStreamStop?.();
                } else if (this.elements) {
                    this.elements.audioElement.srcObject = null;
                }
            } catch (error) {
                console.error("Error in stopRecording:", error);
            } finally {
                this.stream = null;
            }
        }
    }

    private setupWaveform(stream: MediaStream): void {
        if (!this.waveformConfig.enabled || !this.elements?.waveformCanvas || !this.elements?.waveformContainer) {
            return;
        }

        // Show the waveform container
        this.elements.waveformContainer.classList.remove('hidden');

        // Create audio context and analyzer if they don't exist
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }

        // Create analyzer node
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.waveformConfig.resolution! * 2; // Must be power of 2

        // Connect stream to analyzer
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);

        // Start animation loop
        this.drawWaveform();
    }

    private drawWaveform(): void {
        if (!this.waveformConfig.enabled || !this.analyser || !this.elements?.waveformCanvas) {
            return;
        }

        const canvas = this.elements.waveformCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!this.analyser || !ctx) return;

            this.animationFrameId = requestAnimationFrame(draw);
            this.analyser.getByteTimeDomainData(dataArray);

            // Clear canvas
            ctx.fillStyle = this.waveformConfig.backgroundColor || '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw waveform
            ctx.lineWidth = 2;
            ctx.strokeStyle = this.waveformConfig.waveformColor || '#00ff00';
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        // Start animation loop with specified refresh rate
        if (this.waveformConfig.refreshRate && this.waveformConfig.refreshRate < 60) {
            const interval = 1000 / this.waveformConfig.refreshRate;
            setInterval(() => {
                if (!this.animationFrameId) {
                    draw();
                }
            }, interval);
        } else {
            draw();
        }
    }

    private stopWaveform(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Clear canvas if it exists and hide the container
        if (this.elements?.waveformCanvas) {
            const ctx = this.elements.waveformCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, this.elements.waveformCanvas.width, this.elements.waveformCanvas.height);
            }
        }

        // Hide the waveform container
        if (this.elements?.waveformContainer) {
            this.elements.waveformContainer.classList.add('hidden');
        }
    }

    dispose(): void {
        this.stopRecording();

        // Clean up all registered event listeners
        if (this.elements) {
            // Clean up event listeners for all elements
            Object.values(this.elements).forEach((element) => {
                if (element instanceof HTMLElement) {
                    this.removeEventListeners(element);
                }
            });

            // Remove the widget from DOM
            this.elements.micWidget.remove();
            this.elements = null;
        }

        // Clear cached data
        this.micListCache = null;
        this.micListCacheTimestamp = 0;

        // Reset instance flag
        MicManager._instanceCreated = false;
    }
}

export default MicManager;












