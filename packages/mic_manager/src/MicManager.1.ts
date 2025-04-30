export class MicManager {
    private static instance: MicManager;

    private constructor({params}:IMicManagerParams) {
        if (MicManager.instance) throw new Error("MicManager instance already created");
        MicManager.init({params});
    }

    public static getInstance(params: IMicManagerParams): MicManager {
        if (!MicManager.instance) {
            MicManager.instance = new MicManager({params});
        }
        return MicManager.instance;
    }

    private static init({params}:IMicManagerParams){

    }
}


class MicManagerUI{
    private static instance: MicManagerUI;

    private constructor({params}:IMicManagerUIParams) {
        if (MicManagerUI.instance) throw new Error("MicManagerUI instance already created");
        MicManagerUI.init({params});
    }

    public static getInstance(params: IMicManagerUIParams): MicManagerUI {
        if (!MicManagerUI.instance) {
            MicManagerUI.instance = new MicManagerUI({params});
        }
        return MicManagerUI.instance;
    }

    private static init({params}:IMicManagerUIParams){

    }

}

class MicManagerEngine{
    private static instance: MicManagerEngine;

    private constructor({params}:IMicManagerEngineParams) {
        if (MicManagerEngine.instance) throw new Error("MicManagerEngine instance already created");
        MicManagerEngine.init({params});
    }

    public static getInstance(params: IMicManagerEngineParams): MicManagerEngine {
        if (!MicManagerEngine.instance) {
            MicManagerEngine.instance = new MicManagerEngine({params});
        }
        return MicManagerEngine.instance;
    }

    private static init({params}:IMicManagerEngineParams){

    }