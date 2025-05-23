// This module provides a microphone manager that handles audio recording functionality
// It can work with both HTMLAudioElement and custom AudioStreamHandler targets
import { atom } from "nanostores";
import { version } from "../package.json";

/**
 * Configuration parameters for initializing the microphone manager
 * @interface IJFMicMgrParams
 * @property {HTMLElement} rootElememt - Root DOM element where audio UI elements will be attached. 
 *                                      This element will contain any visual components or controls
 *                                      needed for the audio recording interface.
 * @property {HTMLAudioElement | AudioStreamHandler} audioStreamTarget - Target that will receive and handle the audio stream.
 *                                                                      Can be either:
 *                                                                      - HTMLAudioElement: Standard HTML audio element that will play the audio
 *                                                                      - AudioStreamHandler: Custom handler for processing the audio stream
 */
export interface IJFMicMgrParams {
    rootElememt: HTMLElement; // Root DOM element where audio UI elements will be attached
    audioStreamTarget: HTMLAudioElement | AudioStreamHandler; // Target to receive audio stream
}

// Represents a microphone device
export interface IMicrophone {
    deviceId: string; // Unique identifier for the microphone
    label: string;    // Human readable label
}

// Possible states of the microphone manager
export type TMicMgrStates = "Uninitialized" | "Idle" | "Recording" | "Error";

// Defines valid state transitions to maintain state machine integrity
const validStateChanges: Record<TMicMgrStates, TMicMgrStates[]> = {
    "Uninitialized": ["Idle", "Recording", "Error"],
    "Idle": ["Idle","Recording", "Error"],
    "Recording": ["Idle", "Error"], 
    "Error": ["Idle"],
};

// Callback type for state change notifications
export type TOnStateChangeHandler = (currentState: TMicMgrStates) => void;

// Custom error hierarchy for better error handling and debugging
class MicManagerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MicManagerError";
    }
}

class StreamError extends MicManagerError {
    constructor(message: string) {
        super(message);
        this.name = "StreamError"; 
    }
}

class DeviceError extends MicManagerError {
    constructor(message: string) {
        super(message);
        this.name = "DeviceError";
    }
}

// Interface for custom audio stream handling
export interface AudioStreamHandler {
    setStream(stream: MediaStream): void;     // Called when new stream is available
    clearStream(): void;                      // Called when stream ends
    onStreamError(error: Error): void;        // Called on stream errors
}

export interface IJFMicMgrReturn {
    currentState: TMicMgrStates;
    onStateChange: (onStateChangeHandler: TOnStateChangeHandler) => () => void;
    getMicrophoneList: () => Promise<IMicrophone[]>;
    startRecording: (deviceId?: string) => Promise<void>;
    stopRecording: () => void;
}

/**
 * @name jfmicmgr
 * @description Creates a microphone manager instance that handles audio recording functionality.
 * Supports both HTMLAudioElement and custom AudioStreamHandler targets for audio output.
 * Manages microphone device enumeration, recording state transitions, and error handling.
 * 
 * @param params IJFMicMgrParams Configuration parameters for the microphone manager
 * @param params.rootElement HTMLElement where audio UI elements will be attached
 * @param params.audioStreamTarget Target to receive the audio stream (HTMLAudioElement or AudioStreamHandler)
 * 
 * @returns IJFMicMgrReturn Object containing:
 *  - currentState: Current state of the microphone manager
 *  - onStateChange: Function to subscribe to state changes
 *  - getMicrophoneList: Function to get available microphones
 *  - startRecording: Function to start recording from a microphone
 *  - stopRecording: Function to stop current recording
 * 
 * @throws {DeviceError} When media devices are not supported or microphone access is denied
 * @throws {StreamError} When there are issues starting/managing the audio stream
 * @throws {MicManagerError} When invalid state transitions are attempted
 */
export function jfmicmgr(params: IJFMicMgrParams): IJFMicMgrReturn {
    console.log(`jfmicmgr \tversion:${version}\tparameters:`, params);

    // State management using nanostores atom
    const $currentState = atom<TMicMgrStates>("Uninitialized");

    // Subscribe to state changes
    const onStateChange = (onStateChangeHandler: TOnStateChangeHandler) =>
        $currentState.subscribe((newState) => onStateChangeHandler(newState));

    // Cache microphone list to avoid frequent device enumeration
    let micListCache: IMicrophone[] | null = null;
    let micListCacheTimestamp = Date.now();
    const MIC_LIST_CACHE_DURATION = 54321; // Cache duration in milliseconds

    // Audio stream handling
    let audioStream: MediaStream;
    let audioStreamTarget: AudioStreamHandler | HTMLAudioElement = params.audioStreamTarget;

    // Log the type of audio target being used
    if (params.audioStreamTarget instanceof HTMLAudioElement) {
        console.log("audioStreamTarget as HTML Element:", params.audioStreamTarget);
    } else {
        console.log("audioStreamHandler Provided");
    }

    // Stops current recording and cleans up resources
    const stopRecording = () => {
        console.log("stopRecording");
        if (audioStream) {
            audioStream.getTracks().forEach((track) => {
                track.stop();
                audioStream.removeTrack(track);
            });
            changeState("Idle");
        }
    };

    // Retrieves list of available microphones with caching
    const getMicrophoneList = async (): Promise<IMicrophone[]> => {
        const now = Date.now();
        // Return cached list if still valid
        if (micListCache && (now - micListCacheTimestamp) < MIC_LIST_CACHE_DURATION) {
            return micListCache;
        }

        if (!navigator.mediaDevices) {
            changeState("Error");
            throw new DeviceError("MediaDevices API not supported");
        }

        try {
            // Request initial permissions with optimal audio settings
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            // Enumerate available audio input devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const microphones = devices
                .filter((device) => device.kind === "audioinput")
                .map((device) => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone (${device.deviceId})`,
                }));

            // Update cache
            micListCache = microphones;
            micListCacheTimestamp = now;

            changeState("Idle");
            return microphones;

        } catch (error) {
            console.error("Error getting microphone list:", error);
            changeState("Error");
            throw error instanceof Error
                ? new DeviceError(error.message)
                : new DeviceError("Failed to get microphone list");
        }
    };

    // Starts recording from specified or default microphone
    const startRecording = async (deviceId?: string): Promise<void> => {
        console.log("startRecording:", deviceId);
        if (audioStream) {
            stopRecording();
        }

        // Configure audio constraints with optional device selection
        const constraints: MediaStreamConstraints = {
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        };

        try {
            audioStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Route audio stream to appropriate target
            if (params.audioStreamTarget instanceof HTMLAudioElement) {
                (audioStreamTarget as HTMLAudioElement).srcObject = audioStream;
                (audioStreamTarget as HTMLAudioElement).play();
            } else {
                (audioStreamTarget as AudioStreamHandler).setStream(audioStream);
            }

            changeState("Recording");

        } catch (error) {
            console.error("Error starting recording:", error);
            changeState("Error");
            const streamError = error instanceof Error
                ? new StreamError(error.message)
                : new StreamError("Failed to start recording");

            throw streamError;
        }
    };

    // Validates and performs state transitions
    function changeState(newState: TMicMgrStates) {
        const currentState = $currentState.get();
        if (!validStateChanges[currentState].includes(newState)) {
            console.error(`Invalid state transition attempted: ${currentState} -> ${newState}`);
            throw new MicManagerError(
                `Invalid state change from ${currentState} to ${newState}`
            );
        }
        console.log(`State changing from ${currentState} to ${newState}`);
        $currentState.set(newState);
    }

    // Public API
    return {
        currentState: $currentState.get(),
        onStateChange,
        getMicrophoneList,
        startRecording,
        stopRecording,
    };
}
