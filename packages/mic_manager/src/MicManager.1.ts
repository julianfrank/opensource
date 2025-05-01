export class MicManager {
    private static instance: MicManager;

    private constructor({ params }: IMicManagerParams) {
        if (MicManager.instance) {
            throw new Error("MicManager instance already created");
        }
        MicManager.init({ params });
    }

    public static getInstance(params: IMicManagerParams): MicManager {
        if (!MicManager.instance) {
            MicManager.instance = new MicManager({ params });
        }
        return MicManager.instance;
    }

    private static init({ params }: IMicManagerParams) {
    }
}

enum EnumMicManagerUIStates {
    IDLE,
    RECORDING,
    UNINITIALIZED,
    ERROR,
}

interface IMicManagerUIParams {
    rootElement?: HTMLElement;
    StateTexts: {
        UNINITIALIZED?: string;
        IDLE?: string;
        RECORDING?: string;
        ERROR?: string;
    };
}

class MicManagerUI {
    private static instance: MicManagerUI;
    private currentState: EnumMicManagerUIStates =
        EnumMicManagerUIStates.UNINITIALIZED;
    public static rootElement = document.body;
    private static StateTexts = {
        [EnumMicManagerUIStates.IDLE]: "🎙️",
        [EnumMicManagerUIStates.RECORDING]: "🛑",
        [EnumMicManagerUIStates.UNINITIALIZED]: "🏗️",
        [EnumMicManagerUIStates.ERROR]: "⛔",
    };

    private static ValidStateTransitions: Record<
        EnumMicManagerUIStates,
        EnumMicManagerUIStates[]
    > = {
        [EnumMicManagerUIStates.UNINITIALIZED]: [
            EnumMicManagerUIStates.IDLE,
            EnumMicManagerUIStates.ERROR,
        ],
        [EnumMicManagerUIStates.IDLE]: [
            EnumMicManagerUIStates.RECORDING,
            EnumMicManagerUIStates.ERROR,
        ],
        [EnumMicManagerUIStates.RECORDING]: [
            EnumMicManagerUIStates.IDLE,
            EnumMicManagerUIStates.ERROR,
        ],
        [EnumMicManagerUIStates.ERROR]: [EnumMicManagerUIStates.IDLE],
    };

    private constructor(params: IMicManagerUIParams) {
        if (MicManagerUI.instance) {
            throw new Error("MicManagerUI instance already created");
        }
        MicManagerUI.init(params);
    }

    public static getInstance(params: IMicManagerUIParams): MicManagerUI {
        if (!MicManagerUI.instance) {
            MicManagerUI.instance = new MicManagerUI(params);
        }
        return MicManagerUI.instance;
    }

    private static init(params: IMicManagerUIParams) {
        MicManagerUI.rootElement = params?.rootElement || document.body;
        MicManagerUI.StateTexts[EnumMicManagerUIStates.UNINITIALIZED] =
            params.StateTexts.UNINITIALIZED ||
            this.StateTexts[EnumMicManagerUIStates.UNINITIALIZED];
        MicManagerUI.StateTexts[EnumMicManagerUIStates.IDLE] =
            params.StateTexts.IDLE ||
            this.StateTexts[EnumMicManagerUIStates.IDLE];
        MicManagerUI.StateTexts[EnumMicManagerUIStates.RECORDING] =
            params.StateTexts.RECORDING ||
            this.StateTexts[EnumMicManagerUIStates.RECORDING];
        MicManagerUI.StateTexts[EnumMicManagerUIStates.ERROR] =
            params.StateTexts.ERROR ||
            this.StateTexts[EnumMicManagerUIStates.ERROR];
    }
}

class MicManagerEngine {
    private static instance: MicManagerEngine;

    private constructor({ params }: IMicManagerEngineParams) {
        if (MicManagerEngine.instance) {
            throw new Error("MicManagerEngine instance already created");
        }
        MicManagerEngine.init({ params });
    }

    public static getInstance(
        params: IMicManagerEngineParams,
    ): MicManagerEngine {
        if (!MicManagerEngine.instance) {
            MicManagerEngine.instance = new MicManagerEngine({ params });
        }
        return MicManagerEngine.instance;
    }

    private static init({ params }: IMicManagerEngineParams) {
    }
}
