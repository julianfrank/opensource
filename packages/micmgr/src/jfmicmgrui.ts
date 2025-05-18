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

    // Get buttons so we can control their visibility here
    const { buttonCollection, playButton, stopButton } = createButtonCollection(
        params,
    );
    jfmicmgrui.appendChild(buttonCollection);
    rootElement.appendChild(jfmicmgrui);

    params.MicManagerInstance.onStateChange((currentState) => {
        switch (currentState) {
            case "Uninitialized":
                console.debug(`onStateChange:${currentState}`);
                jfmicmgrui.className = "jfmicmgruiuninitialized";
                playButton.classList.add("jfmicmgruihidden");
                stopButton.classList.add("jfmicmgruihidden");
                break;

            case "Error":
                console.error(`onStateChange:${currentState}`);
                jfmicmgrui.className = "jfmicmgruiinerror";
                playButton.classList.add("jfmicmgruihidden");
                stopButton.classList.add("jfmicmgruihidden");
                break;

            case "Idle":
                jfmicmgrui.className = "jfmicmgrui";
                playButton.classList.remove("jfmicmgruihidden");
                stopButton.classList.add("jfmicmgruihidden");
                console.debug(`onStateChange:${currentState}`);
                break;

            case "Recording":
                jfmicmgrui.className = "jfmicmgrui";
                playButton.classList.add("jfmicmgruihidden");
                stopButton.classList.remove("jfmicmgruihidden");
                console.debug(`onStateChange:${currentState}`);
                break;

            default:
                console.error(`Invalid onStateChange:${currentState}`);
                playButton.classList.add("jfmicmgruihidden");
                stopButton.classList.add("jfmicmgruihidden");
                break;
        }
    });
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

    // No state change logic here; handled in main function
    return { buttonCollection, playButton, stopButton };
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
