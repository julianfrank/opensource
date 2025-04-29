// this is just a sample code for dev purpose
import { io } from "socket.io-client";
import MicManager from "../mic_manager/src/MicManager";

import { Gum2NovaSonic } from "./src/GUM2NovaSonic";
console.log("Dev Script Running");

// amazonq-ignore-next-line
const mm = new MicManager({});
mm.createMicUI({});

const gum2NovaSonic = new Gum2NovaSonic();
mm.setStreamTarget(gum2NovaSonic.getStreamTarget());

const socket = io("localhost:8080");
socket.on("connect", async () => {
    console.log("Connected to SIO server with id ", socket.id);
});

socket.on("test", (x) => console.log("test", x));

gum2NovaSonic.attachSIOSocket(socket);
