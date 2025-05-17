import "./css/style.css";
import { type AudioStreamHandler, jfmicmgr } from "./jfmicmgr";

const mic = jfmicmgr({
    rootElememt: document.getElementById("app") || document.body,
    audioStreamTarget: document.getElementsByTagName("audio")[0],
});
console.log(`mic:${JSON.stringify(mic)}`);

mic.onStateChange(async (currentState) => {
    console.log(`onStateChange:${currentState}`);
    // console.log(`micList:`,await mic.getMicrophoneList())
});
console.log(`micList:`, await mic.getMicrophoneList());
mic.startRecording();
window.setTimeout(() => {
    mic.stopRecording();

    const audioHandler: AudioStreamHandler = {
        setStream(stream: MediaStream) {
            console.log(`setStream:`, stream);
        },
        clearStream() {
            console.log(`clearStream`);
        },
        onStreamError(error: Error) {
            console.log(`onStreamError:`, error);
        },
    };
    const mic1 = jfmicmgr({
        rootElememt: document.getElementById("app") || document.body,
        audioStreamTarget: audioHandler,
    });
    mic1.startRecording();
    window.setTimeout(() => {
        mic1.stopRecording();
    }, 3210);
}, 3210);
