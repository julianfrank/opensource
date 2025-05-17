import "./css/style.css";
import { jfmicmgr } from "./jfmicmgr";

const mic=jfmicmgr({ rootElememt: document.getElementById("app") || document.body,audioStreamTarget:document.getElementsByTagName("audio")[0] });
console.log(`mic:${JSON.stringify(mic)}`)

mic.onStateChange(async (currentState)=>{
    console.log(`onStateChange:${currentState}`)
    // console.log(`micList:`,await mic.getMicrophoneList())
})
console.log(`micList:`,await mic.getMicrophoneList())
mic.startRecording()