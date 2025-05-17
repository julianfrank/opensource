// This consolidates the various modules to be presented as a single consumable function that can be exported as a npm module
import { atom } from "nanostores";
import { version } from "../package.json";

interface IJFMicMgrParams {
    rootElememt: HTMLElement;
}

type EMicMgrStates = "Uninitialized" | "Idle" | "Recording" | "Error";

function jfmicmgr(params: IJFMicMgrParams) {
    console.log(
        `jfmicmgr \tversion:${version}\tparameters:${JSON.stringify(params)}`,
    );

    const $currentState = atom<EMicMgrStates>("Uninitialized");

    return {
        currentState: $currentState.get(),
        onStateChange: (
            onStateChangeHandler: (currentState: EMicMgrStates) => void,
        ) => {
            onStateChangeHandler($currentState.get());
        },
    };
}

export { jfmicmgr };
