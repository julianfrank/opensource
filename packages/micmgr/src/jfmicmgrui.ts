import { version } from "../package.json";

import { type IJFMicMgrReturn } from "./jfmicmgr";

import "./css/JFMicMgrUI.css";

export interface IJFMicMgrUIParams {
    rootElement: HTMLElement;
    recordButtonDisplayText?: string;
    stopButtonDisplayText?: string;
    MicManagerInstance: IJFMicMgrReturn;
}

export const jfmicmgrui = async (params: IJFMicMgrUIParams) => {
    const { rootElement } = params;
    console.log(`jfmicmgrui \tversion:${version}\tparameters:`, params);
    const jfmicmgrui = document.createElement("div");
    jfmicmgrui.classList.add("jfmicmgrui");
    jfmicmgrui.appendChild(createButtonCollection(params));
    rootElement.appendChild(jfmicmgrui);

    params.MicManagerInstance.onStateChange((currentState) => {
        switch (currentState) {
            case "Uninitialized":
                console.debug(`onStateChange:${currentState}`);
                jfmicmgrui.className = "jfmicmgruiuninitialized";
                break;

            case "Error":
                console.error(`onStateChange:${currentState}`);
                jfmicmgrui.className = "jfmicmgruiinerror";
                break;

            case "Idle":
                jfmicmgrui.className = "jfmicmgrui";
                console.debug(`onStateChange:${currentState}`);
                break;

            case "Recording":
                jfmicmgrui.className = "jfmicmgrui";
                console.debug(`onStateChange:${currentState}`);
                break;

            default:
                console.error(`Invalid onStateChange:${currentState}`);
                jfmicmgrui.className = "jfmicmgrui";
                break;
        }
    });

    return jfmicmgrui;
};

function createButtonCollection(params: IJFMicMgrUIParams) {
    const buttonCollection = document.createElement("div");
    buttonCollection.classList.add("button-collection");

    const playButton = createRecordButton({
        displayText: params.recordButtonDisplayText || "Record",
    });
    const stopButton = createStopButton({
        displayText: params.stopButtonDisplayText || "Stop",
    });

    buttonCollection.appendChild(playButton);
    buttonCollection.appendChild(stopButton);

    params.MicManagerInstance.onStateChange((currentState) => {
        switch (currentState) {
            case "Uninitialized":
                console.debug(`onStateChange:${currentState}`);
                playButton.className = "record-button jfmicmgruihidden";
                stopButton.className = "stop-button jfmicmgruihidden";
                break;

            case "Error":
                console.error(`onStateChange:${currentState}`);
                playButton.className = "record-button jfmicmgruihidden";
                stopButton.className = "stop-button jfmicmgruihidden";
                break;

            case "Idle":
                playButton.className = "record-button";
                stopButton.className = "stop-button jfmicmgruihidden";
                console.debug(`onStateChange:${currentState}`);
                break;

            case "Recording":
                playButton.className = "record-button jfmicmgruihidden";
                stopButton.className = "stop-button";
                console.debug(`onStateChange:${currentState}`);
                break;

            default:
                playButton.className = "record-button jfmicmgruihidden";
                stopButton.className = "stop-button jfmicmgruihidden";
                console.error(`Invalid onStateChange:${currentState}`);
                break;
        }
    });

    return buttonCollection;
}

function createRecordButton(
    params: { displayText: string } = { displayText: "Record" },
) {
    const playButton = document.createElement("button");
    playButton.className = "record-button";
    playButton.textContent = params.displayText;
    return playButton;
}

function createStopButton(
    params: { displayText: string } = { displayText: "Stop" },
) {
    const stopButton = document.createElement("button");
    stopButton.className = "stop-button";
    stopButton.textContent = params.displayText;
    return stopButton;
}
