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
};

type MicUIElements = {
    micWidget: HTMLDivElement;
    micSettingsContainer: HTMLDivElement;
    settingsButton: HTMLDivElement;
    micList: HTMLSelectElement;
    startButton: HTMLDivElement;
    stopButton: HTMLDivElement;
    audioElement: HTMLAudioElement;
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
        } = params;

        // Update streamTarget if provided
        if (streamTarget) {
            this.setStreamTarget(streamTarget);
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



