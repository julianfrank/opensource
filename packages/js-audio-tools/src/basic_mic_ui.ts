import "./basic_mic_ui.css"

/*
This is a basic mic ui in plain vanilla js that allows user to
1) see the list of mics
2) select the mic hey would like to use
3) start recording
4) stop recording
*/
interface Microphone {
    deviceId: string;
    label: string;
}

// const getMicrophoneList = async (): Promise<Microphone[]> => {
//     const devices = await navigator.mediaDevices.enumerateDevices();
//     return devices
//         .filter((device) => device.kind === "audioinput")
//         .map((device) => ({ deviceId: device.deviceId, label: device.label }));
// };

// const startRecording = async (deviceId: string): Promise<MediaStream> => {
//     return navigator.mediaDevices.getUserMedia({
//         audio: { deviceId: { exact: deviceId } },
//     });
// };

// const stopRecording = (stream: MediaStream): void => {
//     stream.getTracks().forEach((track) => track.stop());
// };

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

// Build the UI for the audio Listener widget
function MicUI({ rootElement,startButtonText,stopButtonText }: MicUIParameters) {
    const micWidget = document.createElement("div");
    micWidget.classList.add("mic-widget");
    (rootElement ?? document.body).appendChild(micWidget);
    const micList = document.createElement("select");
    micList.classList.add("mic-list");
    micWidget.appendChild(micList);
    const startButton = document.createElement("button");
    startButton.classList.add("start-button");
    startButton.textContent = startButtonText??"▶️";
    micWidget.appendChild(startButton);
    const stopButton = document.createElement("button");
    stopButton.classList.add("stop-button");
    stopButton.textContent = stopButtonText??"⏹️";
    micWidget.appendChild(stopButton);
    const audioElement = document.createElement("audio");
    audioElement.classList.add("audio-element");
    micWidget.appendChild(audioElement);
    return { micWidget, micList, startButton, stopButton, audioElement };
}

export default { MicUI };
