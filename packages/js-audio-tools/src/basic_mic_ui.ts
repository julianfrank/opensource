import "./basic_mic_ui.css";

interface Microphone {
    deviceId: string;
    label: string;
}

type MicUIParameters = {
    rootElement?: HTMLElement;
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

    constructor(params: MicUIParameters) {
        if (MicManager._instanceCreated) {
            throw new Error("MicManager instance already created");
        }
        MicManager._instanceCreated = true;
        this.rootElement = params?.rootElement || document.body;
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
        } = params;

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
        micWidget.appendChild(audioElement);

        // Event Listeners
        micList.addEventListener("change", this.handleMicChange.bind(this));
        startButton.addEventListener("click", async () => {
            try {
                await this.startRecording(micList.value);
                if (this.stream && this.elements) {
                    this.elements.audioElement.srcObject = this.stream;
                    this.elements.audioElement.play();
                }
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
            if (this.elements) {
                this.elements.audioElement.srcObject = null;
            }
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

        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (this.stream) {
            this.stream.onaddtrack = (event: MediaStreamTrackEvent) => {
                console.log("onaddtrack", event.track);
            };
        }
    }

    private stopRecording(): void {
        console.log("stopRecording", this.stream);
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
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