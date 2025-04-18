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

    constructor(params: MicUIParameters) {
        if (MicManager._instanceCreated) {
            throw new Error("MicManager instance already created");
        }
        MicManager._instanceCreated = true;
        this.rootElement = params?.rootElement || document.body;
    }

    async getMicrophoneList(): Promise<Microphone[]> {
        try {
            // Request permission first
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
                    label: device.label,
                }));
        } catch (error) {
            console.error("Error getting microphone list:", error);
            throw new Error("Failed to get microphone list");
        }
    }

    updateMicList(micList: HTMLSelectElement, microphones: Microphone[]): void {
        micList.innerHTML = "";
        microphones.forEach((mic) => {
            const option = document.createElement("option");
            option.value = mic.deviceId;
            option.text = mic.label || `Microphone (${mic.deviceId})`;
            micList.appendChild(option);
        });
    }

    createMicUI(params: MicUIParameters): MicUIElements {
        const {
            rootElement = this.rootElement,
            startButtonText = "🎙️",
            stopButtonText = "🛑",
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
        micWidget.appendChild(startButton);

        const stopButton = document.createElement("div");
        stopButton.classList.add("stop-button");
        stopButton.textContent = stopButtonText;
        micWidget.appendChild(stopButton);

        const audioElement = document.createElement("audio");
        audioElement.classList.add("audio-element");
        micWidget.appendChild(audioElement);

        // Initialize microphone list
        this.getMicrophoneList()
            .then((mics) => {
                this.updateMicList(micList, mics);
                params.onMicListChange?.(mics);
            })
            .catch((error) => {
                params.onAudioElementError?.(error);
            });

        return { micWidget, micList, startButton, stopButton, audioElement };
    }

    // Cleanup method
    dispose(): void {
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
    }
}

export default MicManager;
