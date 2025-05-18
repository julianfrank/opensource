import { version } from "../package.json";

export interface IJFMicMgrUIParams {
    rootElement: HTMLElement;
    recordButtonDisplayText?: string;
    stopButtonDisplayText?: string;
}

export const jfmicmgrui = async (
    params: IJFMicMgrUIParams = {
        rootElement: document.body
    },
) => {
    const { rootElement } = params;
    console.log(`jfmicmgrui \tversion:${version}\tparameters:`, params);
    const jfmicmgrui = document.createElement("div");
    jfmicmgrui.classList.add("jfmicmgrui");
    jfmicmgrui.appendChild(createButtonCollection(params));
    rootElement.appendChild(jfmicmgrui);
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

    return buttonCollection;
}

function createRecordButton(
    params: { displayText: string } = { displayText: "Record" },
) {
    const playButton = document.createElement("button");
    playButton.classList.add("record-button");
    playButton.innerText = params.displayText;
    return playButton;
}

function createStopButton(
    params: { displayText: string } = { displayText: "Stop" },
) {
    const stopButton = document.createElement("button");
    stopButton.classList.add("stop-button");
    stopButton.innerText = params.displayText;
    return stopButton;
}
