import "./MicManager.css";
interface Microphone {
    deviceId: string;
    label: string;
}
interface StreamTarget {
    setStream(stream: MediaStream | null): void;
    start?(): void;
    stop?(): void;
    onStreamStart?: () => void;
    onStreamStop?: () => void;
    onStreamError?: (error: Error) => void;
}
interface WaveformConfig {
    enabled?: boolean;
    width?: number;
    height?: number;
    resolution?: number;
    refreshRate?: number;
    backgroundColor?: string;
    waveformColor?: string;
}
type MicUIParameters = {
    rootElement?: HTMLElement;
    streamTarget?: StreamTarget;
    onMicListChange?: (microphones: Microphone[]) => void;
    onStartRecording?: (stream: MediaStream) => void;
    onStopRecording?: () => void;
    onAudioElementError?: (error: Error) => void;
    startButtonText?: string;
    stopButtonText?: string;
    waveform?: WaveformConfig;
    showMicSettings?: boolean;
};
type MicUIElements = {
    micWidget: HTMLDivElement;
    micSettingsContainer: HTMLDivElement;
    settingsButton: HTMLDivElement;
    micList: HTMLSelectElement;
    startButton: HTMLDivElement;
    stopButton: HTMLDivElement;
    audioElement: HTMLAudioElement;
    waveformCanvas?: HTMLCanvasElement;
    waveformContainer?: HTMLDivElement;
};
declare class MicManager {
    private stream;
    private rootElement;
    private static _instanceCreated;
    private elements;
    private startButton;
    private stopButton;
    private streamTarget;
    private useDefaultAudioElement;
    private eventListeners;
    private micListCache;
    private micListCacheTimestamp;
    private readonly MIC_LIST_CACHE_DURATION;
    private audioContext;
    private analyser;
    private waveformConfig;
    private animationFrameId;
    constructor(params: MicUIParameters);
    /**
     * Safely adds an event listener and stores it for cleanup
     * @param element The DOM element to attach the listener to
     * @param type Event type
     * @param listener Event listener function
     */
    private addEventListenerWithCleanup;
    /**
     * Removes all event listeners from an element
     * @param element The DOM element to clean up
     */
    private removeEventListeners;
    /**
     * Sets a custom stream target for audio output
     * @param target The stream target implementation
     */
    setStreamTarget(target: StreamTarget): void;
    /**
     * Removes the custom stream target and reverts to using the default audio element
     */
    clearStreamTarget(): void;
    /**
     * Gets the list of available microphones, using cache when possible
     * @returns Promise<Microphone[]>
     */
    getMicrophoneList(): Promise<Microphone[]>;
    private updateMicList;
    createMicUI(params: MicUIParameters): MicUIElements;
    private handleMicChange;
    private startRecording;
    private stopRecording;
    private updateWaveformPosition;
    private setupWaveform;
    private drawWaveform;
    private stopWaveform;
    /**
     * Enables or disables the mic settings interface
     * @param enabled Whether the mic settings should be shown
     */
    toggleMicSettings(enabled: boolean): void;
    /**
     * Enables or disables the waveform visualization
     * @param enabled Whether the waveform should be shown
     */
    toggleWaveform(enabled: boolean): void;
    /**
     * Sets custom styles for various UI components
     * @param styles Object containing style configurations
     */
    setStyle(styles: {
        backgroundColor?: string;
        waveformColor?: string;
        waveformBackgroundColor?: string;
        buttonBackgroundColor?: string;
        buttonShadowColor?: string;
        micListBackgroundColor?: string;
        micListBorderColor?: string;
    }): void;
    dispose(): void;
}
export default MicManager;
