interface StreamTarget {
    setStream(stream: MediaStream | null): void;
    start?(): void;
    stop?(): void;
    onStreamStart?: () => void;
    onStreamStop?: () => void;
    onStreamError?: (error: Error) => void;
}
export declare class Gum2NovaSonic {
    version: string;
    gumStream: MediaStream | null;
    constructor();
    setStreamTarget(): StreamTarget;
    setStream(stream: MediaStream): void;
    start(): void;
    stop(): void;
    onStreamStart(): void;
    onStreamStop(): void;
    onStreamError(error: Error): void;
}
export default Gum2NovaSonic;
