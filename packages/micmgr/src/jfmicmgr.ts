// This consolidates the various modules to be presented as a single consumable function that can be exported as a npm module
import { atom } from "nanostores";
import { version } from "../package.json";

export interface IJFMicMgrParams {
    rootElememt: HTMLElement;
}

export interface IMicrophone {
    deviceId: string;
    label: string;
}

export type EMicMgrStates = "Uninitialized" | "Idle" | "Recording" | "Error";
const validStateChanges: Record<EMicMgrStates, EMicMgrStates[]> = {
    "Uninitialized": ["Idle", "Recording", "Error"],
    "Idle": ["Recording", "Error"],
    "Recording": ["Idle", "Error"],
    "Error": ["Idle"],
};

export type TOnStateChangeHandler = (currentState: EMicMgrStates) => void;

// Custom error types for better error handling
class MicManagerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MicManagerError";
    }
}

// class StreamError extends MicManagerError {
//     constructor(message: string) {
//         super(message);
//         this.name = "StreamError";
//     }
// }

class DeviceError extends MicManagerError {
    constructor(message: string) {
        super(message);
        this.name = "DeviceError";
    }
}

export function jfmicmgr(params: IJFMicMgrParams) {
    console.log(`jfmicmgr \tversion:${version}\tparameters:`, params);

    const $currentState = atom<EMicMgrStates>("Uninitialized");

    const onStateChange = (onStateChangeHandler: TOnStateChangeHandler) =>
        $currentState.subscribe((newState) => onStateChangeHandler(newState));

    let micListCache: IMicrophone[] | null = null;
    let micListCacheTimestamp = Date.now();
    const MIC_LIST_CACHE_DURATION = 54321;

    const getMicrophoneList = async (): Promise<IMicrophone[]> => {
        // Check if we have a valid cached list
        const now = Date.now();
        if (
            micListCache &&
            (now - micListCacheTimestamp) < MIC_LIST_CACHE_DURATION
        ) {
            return micListCache;
        }

        if (!navigator.mediaDevices) {
            throw new DeviceError("MediaDevices API not supported");
        }

        try {
            // Request permission first with optimal audio settings
            // amazonq-ignore-next-line
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
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
            throw error instanceof Error
                ? new DeviceError(error.message)
                : new DeviceError("Failed to get microphone list");
        }
    };

    function changeState(newState: EMicMgrStates) {
        if (!validStateChanges[$currentState.get()].includes(newState)) {
            throw new MicManagerError(
                `Invalid state change from ${$currentState.get()} to ${newState}`,
            );
        }
        $currentState.set(newState);
    }

    return {
        currentState: $currentState.get(),
        onStateChange,
        getMicrophoneList,
    };
}
