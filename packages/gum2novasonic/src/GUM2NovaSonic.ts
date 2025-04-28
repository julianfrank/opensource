import { version } from "../package.json";

import { Socket } from "socket.io-client";

interface StreamTarget {
    setStream(stream: MediaStream | null): void;
    start?(): void;
    stop?(): void;
    onStreamStart?: () => void;
    onStreamStop?: () => void;
    onStreamError?: (error: Error) => void;
}

export class Gum2NovaSonic {
    version: string;
    gumStream: MediaStream | null = null;

    constructor() {
        this.version = version;
        console.log(
            `Gum2NovaSonic\t|\tversion : ${this.version}\t|\tAuthor : Julian Frank`,
        );
    }

    setStreamTarget(): StreamTarget {
        return {
            setStream: this.setStream,
            start: this.start,
            stop: this.stop,
            onStreamStart: this.onStreamStart,
            onStreamStop: this.onStreamStop,
            onStreamError: this.onStreamError,
        };
    }

    setStream(stream: MediaStream): void {
        if (stream === undefined) {
            throw new Error("Stream from GUM cannot be undefined");
        }
        if (this.gumStream) {
            this.gumStream.getTracks().forEach((track) => {
                track.stop();
            });
        }
        this.gumStream = stream;
    }
    start(): void {
        console.log(`GUM Stream Start Called`);
    }
    stop(): void {
        console.log(`GUM Stream Stop Called`);
    }
    onStreamStart(): void {
        console.log(`GUM Stream Started`);
    }
    onStreamStop(): void {
        console.log(`GUM Stream Stopped`);
    }
    onStreamError(error: Error): void {
        console.error(`GUM Stream Error: ${error}`);
    }

    attachSIOSocket(sioSocket: Socket) {
        console.log(`Attaching SIO Socket`, { sioSocket });
        sioSocket.on("connect", () => {
            console.log(`SIO Socket Connected`);
        });
        sioSocket.on("disconnect", () => {
            console.log(`SIO Socket Disconnected`);
        });
        sioSocket.on("connect_error", (error) => {
            console.error(`SIO Socket Connect Error: ${error}`);
        });
        sioSocket.on("connect_timeout", () => {
            console.log(`SIO Socket Connect Timeout`);
        });
        sioSocket.on("error", (error) => {
            console.error(`SIO Socket Error: ${error}`);
        });
        sioSocket.on("reconnect", () => {
            console.log(`SIO Socket Reconnected`);
        });
        sioSocket.on("reconnect_attempt", () => {
            console.log(`SIO Socket Reconnect Attempt`);
        });
        sioSocket.on("reconnect_failed", () => {
            console.log(`SIO Socket Reconnect Failed`);
        });
        sioSocket.on("reconnect_error", (error) => {
            console.error(`SIO Socket Reconnect Error: ${error}`);
        });
        sioSocket.on("reconnecting", () => {
            console.log(`SIO Socket Reconnecting`);
        });
        sioSocket.on("ping", () => {
            console.log(`SIO Socket Ping`);
        });
        sioSocket.on("pong", () => {
            console.log(`SIO Socket Pong`);
        });
    }
}

export default Gum2NovaSonic;
