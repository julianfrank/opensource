// this is just a sample code for dev purpose 
import MicManager from "../mic_manager/src/MicManager"

import {Gum2NovaSonic} from "./src/Gum2NovaSonic"
console.log("Dev Script Running")

// amazonq-ignore-next-line
const mm=new MicManager({})
mm.createMicUI({})

const gum2NovaSonic=new Gum2NovaSonic()
mm.setStreamTarget(gum2NovaSonic.setStreamTarget())