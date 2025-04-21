declare module '@julianfrank/micmanager' {
    export interface Microphone {
        deviceId: string;
        label: string;
    }

    export interface StreamTarget {
        setStream(stream: MediaStream | null): void;
        start?(): void;
        stop?(): void;
        onStreamStart?(): void;
        onStreamStop?(): void;
        onStreamError?(error: Error): void;
    }

    export interface WaveformConfig {
        enabled?: boolean;
        width?: number;
        height?: number;
        resolution?: number;
        refreshRate?: number;
        backgroundColor?: string;
        waveformColor?: string;
    }

    export type MicUIParameters = {
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

    export type MicUIElements = {
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

    export class MicManagerError extends Error {
        constructor(message: string);
    }

    export class StreamError extends MicManagerError {
        constructor(message: string);
    }

    export class DeviceError extends MicManagerError {
        constructor(message: string);
    }

    export class MicManager {
        constructor(params: MicUIParameters);
        
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
        
        /**
         * Creates the microphone UI elements
         * @param params Configuration parameters for the UI
         * @returns The created UI elements
         */
        createMicUI(params: MicUIParameters): MicUIElements;
        
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
        
        /**
         * Cleans up all resources used by the MicManager
         */
        dispose(): void;
    }

    export default MicManager;
}