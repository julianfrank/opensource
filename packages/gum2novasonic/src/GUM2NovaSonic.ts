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

interface PCMBufferChunk {
    sampleRate: number;
    channelCount: number;
    buffer: Int16Array;
}

export class Gum2NovaSonic {
    version: string;
    gumStream: MediaStream | null = null;
    selectedTrack: MediaStreamTrack | null = null;
    private sioSocket: Socket | null = null;

    constructor() {
        this.version = version;
        console.log(
            `Gum2NovaSonic\t|\tversion : ${this.version}\t|\tAuthor : Julian Frank`,
        );
    }

    getStreamTarget(): StreamTarget {
        return {
            setStream: this.setStream,
            start: this.start,
            stop: this.stop,
            onStreamStart: this.onStreamStart,
            onStreamStop: this.onStreamStop,
            onStreamError: this.onStreamError,
        };
    }

    setStream = (stream: MediaStream): void => {
        if (stream === undefined) {
            throw new Error("Stream from GUM cannot be undefined");
        }
        if (this.gumStream) {
            this.gumStream.getTracks().forEach((track) => {
                track.stop();
            });
        }
        this.gumStream = stream;

        if (this.gumStream) {
            this.gumStream.getTracks().forEach((track) => {
                console.log(
                    `GUM Stream Capabilities\t:\ttrack:${track.label}\ttrack.getCapabilities():\t`,
                    track.getCapabilities(),
                );
                console.log(
                    `GUM Stream Settings\t:\ttrack:${track.label}\ttrack.getSettings():\t`,
                    track.getSettings(),
                );
                console.log(
                    `GUM Stream Constraints\t:\ttrack:${track.label}\ttrack.getConstraints():\t`,
                    track.getConstraints(),
                );
            });
            this.selectedTrack = this.gumStream.getAudioTracks()[0];
            this.selectedTrack.addEventListener("ended", () => {
                console.log(
                    `GUM Stream End Event Triggered for track:${this.selectedTrack?.label}`,
                );
            });
            this.selectedTrack.addEventListener("mute", () => {
                console.log(
                    `GUM Stream Mute Event Triggered for track:${this.selectedTrack?.label}`,
                );
            });
            this.selectedTrack.addEventListener("unmute", () => {
                console.log(
                    `GUM Stream Unmute Event Triggered for track:${this.selectedTrack?.label}`,
                );
            });
            if (this.selectedTrack.readyState === "live") {
                this.start();
            } else {
                this.stop();
            }
        }
    };
    start(): void {
        console.log(
            `GUM Stream Start Called with this.selectedTrack?.enabled=${this.selectedTrack?.enabled}`,
        );
        if (this.selectedTrack?.enabled) return;

        this.onStreamStart?.();
    }
    stop(): void {
        console.log(`GUM Stream Stop Called`);
        if (this.selectedTrack?.enabled) {
            this.selectedTrack.stop();
        }
    }
    onStreamStart = async () => {
        console.log(`GUM Stream Started with `, {
            sioSocket: this.sioSocket,
            gumStream: this.gumStream,
        });

        if (!this.sioSocket || !this.gumStream) return;

        // Convert the MediaStream to Buffer compatible with AWS Nova Sonic and start streaming into the socket

        // Create AudioContext and MediaStreamSource
        const audioContext = new AudioContext();

        const source = audioContext.createMediaStreamSource(this.gumStream);

        try {
            await audioContext.audioWorklet.addModule(
                new URL(
                    "./nova-sonic-egress-audio-processor.ts",
                    import.meta.url,
                ).href,
            );

            const audioWorkletNode = new AudioWorkletNode(
                audioContext,
                "nova-sonic-egress-audio-processor",
            );

            // Connect nodes
            source.connect(audioWorkletNode);

            audioWorkletNode.connect(audioContext.destination);

            console.log({ audioContext, source, audioWorkletNode });

            // Listen for processed audio data
            audioWorkletNode.port.onmessage = (event) => {
                console.log({ event });

                const pcmBuffer = event.data as Int16Array;

                // console.log({
                //     audioContext,
                //     source,
                //     audioWorkletNode,
                //     connected: this.sioSocket,
                // });

                // Send buffer through socket if connected
                if (this.sioSocket?.connected) {
                    this.sioSocket.emit("audio-data", {
                        sampleRate: audioContext.sampleRate,
                        channelCount: 1,
                        buffer: pcmBuffer,
                    } as PCMBufferChunk);
                }
            };
        } catch (error) {
            console.error("Failed to load audio worklet:", error);
            throw error;
        }
    };
    onStreamStop(): void {
        console.log(`GUM Stream Stopped`);
    }
    onStreamError(error: Error): void {
        console.error(`GUM Stream Error: ${error}`);
    }

    attachSIOSocket = (sioSocket: Socket) => {
        console.log(`Attaching SIO Socket`, { sioSocket });

        this.sioSocket = sioSocket;

        sioSocket.on("connect", () => {
            console.log(`SIO Socket Connected`, this.sioSocket);
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
    };
}

export default Gum2NovaSonic;
