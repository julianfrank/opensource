import { version } from "../package.json";

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
        if (stream === undefined) throw new Error("Stream from GUM cannot be undefined");
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
}

export default Gum2NovaSonic;
