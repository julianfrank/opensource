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
    micList: HTMLSelectElement;
    startButton: HTMLDivElement;
    stopButton: HTMLDivElement;
    audioElement: HTMLAudioElement;
};

export class MicManager {
    private stream: MediaStream | null = null;
    private rootElement: HTMLElement;
    private static _instanceCreated = false;
    private elements: MicUIElements | null = null;
    private startButton: HTMLDivElement | null = null;
    private stopButton: HTMLDivElement | null = null;
    private streamTarget: StreamTarget | null = null;
    private useDefaultAudioElement: boolean = true;

    constructor(params: MicUIParameters) {
        if (MicManager._instanceCreated) {
            throw new Error("MicManager instance already created");
        }
        MicManager._instanceCreated = true;
        this.rootElement = params?.rootElement || document.body;
        
        if (params.streamTarget) {
            this.setStreamTarget(params.streamTarget);
        }
    }

    /**
     * Sets a custom stream target for audio output
     * @param target The stream target implementation
     */
    setStreamTarget(target: StreamTarget): void {
        // If we have an active stream, we need to stop it first
        if (this.stream) {
            this.stopRecording();
        }

        this.streamTarget = target;
        this.useDefaultAudioElement = false;

        // If we have elements created, update the audio element visibility
        if (this.elements) {
            this.elements.audioElement.style.display = 'none';
        }
    }

    /**
     * Removes the custom stream target and reverts to using the default audio element
     */
    clearStreamTarget(): void {
        // If we have an active stream, we need to stop it first
        if (this.stream) {
            this.stopRecording();
        }

        this.streamTarget = null;
        this.useDefaultAudioElement = true;

        // If we have elements created, restore the audio element visibility
        if (this.elements) {
            this.elements.audioElement.style.display = 'block';
        }
    }

    async getMicrophoneList(): Promise<Microphone[]> {
        if (!navigator.mediaDevices) {
            throw new Error("MediaDevices API not supported");
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
            return devices
                .filter((device) => device.kind === "audioinput")
                .map((device) => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone (${device.deviceId})`,
                }));
        } catch (error) {
            console.error("Error getting microphone list:", error);
            throw error instanceof Error ? error : new Error("Failed to get microphone list");
        }
    }

    private updateMicList(micList: HTMLSelectElement, microphones: Microphone[]): void {
        micList.innerHTML = "";
        microphones.forEach((mic) => {
            const option = document.createElement("option");
            option.value = mic.deviceId;
            option.text = mic.label;
            micList.appendChild(option);
        });
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

        const micList = document.createElement("select");
        micList.classList.add("mic-list");
        micWidget.appendChild(micList);

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
            audioElement.style.display = 'none';
        }
        micWidget.appendChild(audioElement);

        // Event Listeners
        micList.addEventListener("change", this.handleMicChange.bind(this));
        startButton.addEventListener("click", async () => {
            try {
                await this.startRecording(micList.value);
                onStartRecording?.(this.stream!);

                //Update UI Buttons
                startButton.style.display = "none";
                stopButton.style.display = "block";
            } catch (error) {
                console.error("Error starting recording:", error);
                onAudioElementError?.(error instanceof Error ? error : new Error("Failed to start recording"));
            }
        });

        stopButton.addEventListener("click", () => {
            this.stopRecording();
            onStopRecording?.();
            //Update UI Buttons
            startButton.style.display = "block";
            stopButton.style.display = "none";
        });

        // Initialize microphone list
        this.getMicrophoneList()
            .then((mics) => {
                this.updateMicList(micList, mics);
                params.onMicListChange?.(mics);
            })
            .catch((error) => {
                params.onAudioElementError?.(error instanceof Error ? error : new Error("Failed to initialize microphone list"));
            });

        this.elements = { micWidget, micList, startButton, stopButton, audioElement };
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
        console.log("startRecording", deviceId);
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
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (this.stream) {
                this.stream.onaddtrack = (event: MediaStreamTrackEvent) => {
                    console.log("onaddtrack", event.track);
                };

                // Handle stream routing based on target
                if (this.streamTarget) {
                    this.streamTarget.setStream(this.stream);
                    this.streamTarget.start?.();
                    this.streamTarget.onStreamStart?.();
                } else if (this.useDefaultAudioElement && this.elements) {
                    this.elements.audioElement.srcObject = this.stream;
                    this.elements.audioElement.play();
                }
            }
        } catch (error) {
            console.error("Error starting recording:", error);
            if (this.streamTarget) {
                this.streamTarget.onStreamError?.(error instanceof Error ? error : new Error("Failed to start recording"));
            }
            throw error;
        }
    }

    private stopRecording(): void {
        console.log("stopRecording", this.stream);
        if (this.stream) {
            // Stop all tracks
            this.stream.getTracks().forEach((track) => track.stop());
            
            // Handle stream cleanup based on target
            if (this.streamTarget) {
                this.streamTarget.setStream(null);
                this.streamTarget.stop?.();
                this.streamTarget.onStreamStop?.();
            } else if (this.elements) {
                this.elements.audioElement.srcObject = null;
            }
            
            this.stream = null;
        }
    }

    dispose(): void {
        this.stopRecording();
        if (this.elements) {
            this.elements.micWidget.remove();
            this.elements = null;
        }
        MicManager._instanceCreated = false;
    }
}

export default MicManager;



