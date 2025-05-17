import "./css/style.css";
import { jfmicmgr } from "./jfmicmgr";

const mic=jfmicmgr({ rootElememt: document.getElementById("app") || document.body });
console.log(`mic:${JSON.stringify(mic)}`)
mic.onStateChange((currentState)=>{
    console.log(`onStateChange:${currentState}`)
})