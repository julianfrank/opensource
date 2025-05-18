import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jfmicmgrui, type IJFMicMgrUIParams } from './jfmicmgrui';

describe('jfmicmgrui', () => {
    let rootElement: HTMLElement;
    let mockMicManagerInstance: any;

    beforeEach(() => {
        // Setup DOM element
        rootElement = document.createElement('div');
        
        // Create mock MicManagerInstance
        mockMicManagerInstance = {
            onStateChange: vi.fn((callback) => {
                mockMicManagerInstance._callback = callback;
            }),
            triggerStateChange: function(state: string) {
                this._callback(state);
            }
        };
    });

    it('should create UI elements with default button texts', async () => {
        const params: IJFMicMgrUIParams = {
            rootElement,
            MicManagerInstance: mockMicManagerInstance
        };

        await jfmicmgrui(params);

        const recordButton = rootElement.querySelector('.record-button') as HTMLElement;
        const stopButton = rootElement.querySelector('.stop-button') as HTMLElement;

        expect(recordButton).toBeTruthy();
        expect(stopButton).toBeTruthy();
        expect(recordButton.textContent).toBe('Record');
        expect(stopButton.textContent).toBe('Stop');
    });

    it('should create UI elements with custom button texts', async () => {
        const params: IJFMicMgrUIParams = {
            rootElement,
            recordButtonDisplayText: 'Start Recording',
            stopButtonDisplayText: 'End Recording',
            MicManagerInstance: mockMicManagerInstance
        };

        await jfmicmgrui(params);

        const recordButton = rootElement.querySelector('.record-button') as HTMLElement;
        const stopButton = rootElement.querySelector('.stop-button') as HTMLElement;

        expect(recordButton.textContent).toBe('Start Recording');
        expect(stopButton.textContent).toBe('End Recording');
    });

    it('should handle state changes correctly', async () => {
        const params: IJFMicMgrUIParams = {
            rootElement,
            MicManagerInstance: mockMicManagerInstance
        };

        await jfmicmgrui(params);

        // Test Uninitialized state
        mockMicManagerInstance.triggerStateChange('Uninitialized');
        expect(rootElement.querySelector('.jfmicmgruiuninitialized')).toBeTruthy();
        expect(rootElement.querySelector('.record-button')?.classList.contains('jfmicmgruihidden')).toBe(true);
        expect(rootElement.querySelector('.stop-button')?.classList.contains('jfmicmgruihidden')).toBe(true);

        // Test Recording state
        mockMicManagerInstance.triggerStateChange('Recording');
        expect(rootElement.querySelector('.jfmicmgrui')).toBeTruthy();
        expect(rootElement.querySelector('.record-button')?.classList.contains('jfmicmgruihidden')).toBe(true);
        expect(rootElement.querySelector('.stop-button')?.classList.contains('stop-button')).toBe(true);

        // Test Idle state
        mockMicManagerInstance.triggerStateChange('Idle');
        expect(rootElement.querySelector('.jfmicmgrui')).toBeTruthy();
        expect(rootElement.querySelector('.record-button')?.classList.contains('record-button')).toBe(true);
        expect(rootElement.querySelector('.stop-button')?.classList.contains('jfmicmgruihidden')).toBe(true);

        // Test Error state
        mockMicManagerInstance.triggerStateChange('Error');
        expect(rootElement.querySelector('.jfmicmgruiinerror')).toBeTruthy();
        expect(rootElement.querySelector('.record-button')?.classList.contains('jfmicmgruihidden')).toBe(true);
        expect(rootElement.querySelector('.stop-button')?.classList.contains('jfmicmgruihidden')).toBe(true);
    });

    it('should handle invalid states', async () => {
        const consoleSpy = vi.spyOn(console, 'error');
        const params: IJFMicMgrUIParams = {
            rootElement,
            MicManagerInstance: mockMicManagerInstance
        };

        await jfmicmgrui(params);

        mockMicManagerInstance.triggerStateChange('InvalidState');
        
        expect(consoleSpy).toHaveBeenCalledWith('Invalid onStateChange:InvalidState');
        expect(rootElement.querySelector('.record-button')?.classList.contains('jfmicmgruihidden')).toBe(true);
        expect(rootElement.querySelector('.stop-button')?.classList.contains('jfmicmgruihidden')).toBe(true);
    });
});
