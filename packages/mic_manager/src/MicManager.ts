import "./MicManager.css";

import {version} from  "../package.json"

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
    onAudioElementError?: (error: Error) => void;
    startButtonText?: string;
    stopButtonText?: string;
    waveform?: WaveformConfig;
    showMicSettings?: boolean;
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

class MicManager {
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
        width: 64,
        height: 32,
        resolution: 32,
        refreshRate: 1,
        backgroundColor: "#000000",
        waveformColor: "#00ff00",
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
        console.log(`Mic Manager\tVersion: ${version}\tAuthor: Julian Frank`)
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
            // amazonq-ignore-next-line
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
            // amazonq-ignore-next-line
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
            showMicSettings = false,
        } = params;

        // Update streamTarget if provided
        if (streamTarget) {
            this.setStreamTarget(streamTarget);
        }

        // Update waveform configuration if provided
        if (waveform) {
            this.waveformConfig = {
                ...this.waveformConfig,
                ...waveform,
            };
        }

        const micWidget = document.createElement("div");
        micWidget.classList.add("mic-widget");
        rootElement.appendChild(micWidget);

        // Create a container for the mic list and settings button
        const micSettingsContainer = document.createElement("div");
        micSettingsContainer.classList.add("mic-settings-container");
        if (!showMicSettings) {
            micSettingsContainer.style.display = "none";
        }
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
            // Create waveform container as a sibling to mic-widget
            waveformContainer = document.createElement("div");
            waveformContainer.classList.add("waveform-container", "hidden");
            rootElement.appendChild(waveformContainer);

            // Position the waveform container relative to the mic-widget
            waveformContainer.style.position = "absolute";
            waveformContainer.style.width = `${
                this.waveformConfig.width || 300
            }px`;
            waveformContainer.style.display = "block"; // Ensure display is set
            waveformContainer.style.visibility = "visible"; // Ensure visibility is set

            waveformCanvas = document.createElement("canvas");
            waveformCanvas.classList.add("waveform-canvas");
            waveformCanvas.width = this.waveformConfig.width || 300;
            waveformCanvas.height = this.waveformConfig.height || 150;
            waveformCanvas.style.display = "block"; // Ensure canvas is displayed
            waveformContainer.appendChild(waveformCanvas);

            // Force a reflow to ensure proper positioning
            waveformContainer.offsetHeight;

            // Update position initially and on window resize
            this.updateWaveformPosition();
            window.addEventListener("resize", this.updateWaveformPosition);

            // Log waveform creation
            // console.log("Waveform container created:", {
            //     width: waveformCanvas.width,
            //     height: waveformCanvas.height,
            //     containerWidth: waveformContainer.style.width,
            // });
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
            waveformContainer,
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
            // amazonq-ignore-next-line
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

    private updateWaveformPosition = (): void => {
        if (this.elements?.waveformContainer && this.elements?.micWidget) {
            const micWidgetRect = this.elements.micWidget
                .getBoundingClientRect();
            this.elements.waveformContainer.style.left =
                `${micWidgetRect.left}px`;
            this.elements.waveformContainer.style.top = `${
                micWidgetRect.bottom + 8
            }px`; // 8px gap
        }
    };

    private setupWaveform(stream: MediaStream): void {
        if (!this.waveformConfig.enabled) {
            // console.log("Waveform visualization is disabled");
            return;
        }

        if (
            !this.elements?.waveformCanvas || !this.elements?.waveformContainer
        ) {
            console.error("Waveform elements not found");
            return;
        }

        try {
            // Show the waveform container and ensure it's visible
            this.elements.waveformContainer.classList.remove("hidden");
            this.elements.waveformContainer.style.display = "block";
            this.elements.waveformContainer.style.visibility = "visible";

            // Force layout recalculation
            this.elements.waveformContainer.offsetHeight;

            // Create audio context if it doesn't exist
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
                // console.log("Created new AudioContext");
            }

            // Create analyzer node with error checking
            try {
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = this.waveformConfig.resolution! * 2; // Must be power of 2
                // console.log(
                //     "Analyzer created with fftSize:",
                //     this.analyser.fftSize,
                // );
            } catch (error) {
                console.error("Failed to create analyzer:", error);
                return;
            }

            // Connect stream to analyzer with error checking
            try {
                const source = this.audioContext.createMediaStreamSource(
                    stream,
                );
                source.connect(this.analyser);
                // console.log("Stream connected to analyzer");
            } catch (error) {
                console.error("Failed to connect stream to analyzer:", error);
                return;
            }

            // Update waveform position
            this.updateWaveformPosition();

            // Start animation loop
            // console.log("Starting waveform animation");
            this.drawWaveform();
        } catch (error) {
            console.error("Error in setupWaveform:", error);
        }
    }

    private drawWaveform(): void {
        if (!this.waveformConfig.enabled) {
            // console.log("Waveform visualization is disabled");
            return;
        }

        if (!this.analyser || !this.elements?.waveformCanvas) {
            console.error("Missing analyser or canvas element");
            return;
        }

        const canvas = this.elements.waveformCanvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("Failed to get canvas context.");
            return;
        }

        // Ensure canvas dimensions are set correctly
        canvas.width = this.waveformConfig.width || 300;
        canvas.height = this.waveformConfig.height || 150;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!this.analyser || !ctx) {
                // console.warn("Analyser or context lost during animation. This can be ignored safely.");
                return;
            }

            try {
                this.animationFrameId = requestAnimationFrame(draw);

                // Get waveform data
                this.analyser.getByteTimeDomainData(dataArray);

                // Clear canvas with background color
                ctx.fillStyle = this.waveformConfig.backgroundColor ||
                    "#000000";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw waveform
                ctx.lineWidth = 2;
                ctx.strokeStyle = this.waveformConfig.waveformColor ||
                    "#00ff00";
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
            } catch (error) {
                console.error("Error in draw loop:", error);
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
            }
        };

        // Start animation loop with specified refresh rate
        if (
            this.waveformConfig.refreshRate &&
            this.waveformConfig.refreshRate < 60
        ) {
            const interval = 1000 / this.waveformConfig.refreshRate;
            let lastDraw = 0;

            const throttledDraw = (timestamp: number) => {
                if (!lastDraw || timestamp - lastDraw >= interval) {
                    draw();
                    lastDraw = timestamp;
                }
                this.animationFrameId = requestAnimationFrame(throttledDraw);
            };

            this.animationFrameId = requestAnimationFrame(throttledDraw);
        } else {
            draw();
        }

        // console.log("Waveform drawing started");
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
            const ctx = this.elements.waveformCanvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(
                    0,
                    0,
                    this.elements.waveformCanvas.width,
                    this.elements.waveformCanvas.height,
                );
            }
        }

        // Hide the waveform container
        if (this.elements?.waveformContainer) {
            this.elements.waveformContainer.classList.add("hidden");
        }
    }

    /**
     * Enables or disables the mic settings interface
     * @param enabled Whether the mic settings should be shown
     */
    toggleMicSettings(enabled: boolean): void {
        if (!this.elements?.micSettingsContainer) {
            console.warn("Mic settings container not initialized");
            return;
        }
        this.elements.micSettingsContainer.style.display = enabled ? "flex" : "none";
    }

    /**
     * Enables or disables the waveform visualization
     * @param enabled Whether the waveform should be shown
     */
    toggleWaveform(enabled: boolean): void {
        this.waveformConfig.enabled = enabled;
        
        if (!enabled) {
            this.stopWaveform();
        } else if (this.stream) {
            // If we have an active stream, restart the waveform
            this.setupWaveform(this.stream);
        }
    }

    /**
     * Sets custom styles for various UI components
     * @param styles Object containing style configurations
     */
    setStyle(styles: {
        backgroundColor?: string;
        waveformColor?: string;
        waveformBackgroundColor?: string;
        buttonBackgroundColor?: string;
        buttonShadowColor?: string;
        micListBackgroundColor?: string;
        micListBorderColor?: string;
    }): void {
        // Update waveform colors if provided
        if (styles.waveformColor) {
            this.waveformConfig.waveformColor = styles.waveformColor;
        }
        if (styles.waveformBackgroundColor) {
            this.waveformConfig.backgroundColor = styles.waveformBackgroundColor;
        }

        if (!this.elements) {
            console.warn("UI elements not initialized");
            return;
        }

        // Apply background color to the widget
        if (styles.backgroundColor) {
            this.elements.micWidget.style.backgroundColor = styles.backgroundColor;
        }

        // Apply button styles
        if (styles.buttonBackgroundColor || styles.buttonShadowColor) {
            const buttons = [
                this.elements.startButton,
                this.elements.stopButton,
                this.elements.settingsButton
            ];

            buttons.forEach(button => {
                if (styles.buttonBackgroundColor) {
                    button.style.backgroundColor = styles.buttonBackgroundColor;
                }
                if (styles.buttonShadowColor) {
                    button.style.boxShadow = `0rem 0rem 0.5rem ${styles.buttonShadowColor}`;
                }
            });
        }

        // Apply mic list styles
        if (styles.micListBackgroundColor || styles.micListBorderColor) {
            if (styles.micListBackgroundColor) {
                this.elements.micList.style.backgroundColor = styles.micListBackgroundColor;
            }
            if (styles.micListBorderColor) {
                this.elements.micList.style.borderColor = styles.micListBorderColor;
            }
        }
    }

    dispose(): void {
        this.stopRecording();

        // Remove window resize event listener if it exists
        if (this.elements?.waveformContainer) {
            window.removeEventListener("resize", this.updateWaveformPosition);
        }

        // Clean up all registered event listeners
        if (this.elements) {
            // Clean up event listeners for all elements
            Object.values(this.elements).forEach((element) => {
                if (element instanceof HTMLElement) {
                    this.removeEventListeners(element);
                    // Remove the waveform container from DOM if it exists
                    if (element === this.elements?.waveformContainer) {
                        element.remove();
                    }
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




