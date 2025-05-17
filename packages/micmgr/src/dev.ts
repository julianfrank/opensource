import "./css/style.css";
import { jfmicmgr } from "./jfmicmgr";

const mic=jfmicmgr({ rootElememt: document.getElementById("app") || document.body });
console.log(`mic:${JSON.stringify(mic)}`)
mic.onStateChange(async (currentState)=>{
    console.log(`onStateChange:${currentState}`)
    console.log(`micList:`,await mic.getMicrophoneList())
})