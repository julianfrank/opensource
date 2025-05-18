import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jfmicmgr, type IJFMicMgrParams, type AudioStreamHandler, type EMicMgrStates } from './jfmicmgr';

describe('jfmicmgr', () => {
    let mockRootElement: HTMLElement;
    let mockAudioElement: HTMLAudioElement;
    let mockMediaDevices: any;
    let mockStream: MediaStream;
    let mockAudioTrack: MediaStreamTrack;

    beforeEach(() => {
        // Setup DOM mocks
        mockRootElement = document.createElement('div');
        mockAudioElement = document.createElement('audio');
        
        // Setup MediaStream mocks
        mockAudioTrack = {
            stop: vi.fn(),
        } as unknown as MediaStreamTrack;
        
        mockStream = {
            getTracks: vi.fn().mockReturnValue([mockAudioTrack]),
            removeTrack: vi.fn(),
        } as unknown as MediaStream;

        // Setup navigator.mediaDevices mock
        mockMediaDevices = {
            getUserMedia: vi.fn().mockResolvedValue(mockStream),
            enumerateDevices: vi.fn().mockResolvedValue([
                { kind: 'audioinput', deviceId: 'device1', label: 'Mic 1' },
                { kind: 'audioinput', deviceId: 'device2', label: 'Mic 2' },
                { kind: 'videoinput', deviceId: 'device3', label: 'Camera' }
            ])
        };

        // Mock navigator.mediaDevices
        Object.defineProperty(navigator, 'mediaDevices', {
            value: mockMediaDevices,
            writable: true
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with HTMLAudioElement target', () => {
            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockAudioElement
            };

            const manager = jfmicmgr(params);
            expect(manager.currentState).toBe('Uninitialized');
            expect(typeof manager.startRecording).toBe('function');
            expect(typeof manager.stopRecording).toBe('function');
            expect(typeof manager.getMicrophoneList).toBe('function');
            expect(typeof manager.onStateChange).toBe('function');
        });

        it('should initialize with AudioStreamHandler target', () => {
            const mockStreamHandler: AudioStreamHandler = {
                setStream: vi.fn(),
                clearStream: vi.fn(),
                onStreamError: vi.fn()
            };

            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockStreamHandler
            };

            const manager = jfmicmgr(params);
            expect(manager.currentState).toBe('Uninitialized');
        });
    });

    describe('getMicrophoneList', () => {
        it('should return list of available microphones', async () => {
            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockAudioElement
            };

            const manager = jfmicmgr(params);
            const mics = await manager.getMicrophoneList();

            expect(mics).toHaveLength(2); // Only audio inputs
            expect(mics[0]).toEqual({
                deviceId: 'device1',
                label: 'Mic 1'
            });
        });

        it('should throw DeviceError when MediaDevices API is not supported', async () => {
            // Remove mediaDevices API
            Object.defineProperty(navigator, 'mediaDevices', {
                value: undefined,
                writable: true
            });

            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockAudioElement
            };

            const manager = jfmicmgr(params);
            await expect(manager.getMicrophoneList()).rejects.toThrow('MediaDevices API not supported');
        });
    });

    describe('Recording Controls', () => {
        it('should start recording with default device', async () => {
            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockAudioElement
            };

            const manager = jfmicmgr(params);
            await manager.startRecording();

            expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: {
                    deviceId: undefined,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
        });

        it('should start recording with specific device', async () => {
            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockAudioElement
            };

            const manager = jfmicmgr(params);
            await manager.startRecording('device1');

            expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: {
                    deviceId: { exact: 'device1' },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
        });

        it('should stop recording and clean up resources', async () => {
            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockAudioElement
            };

            const manager = jfmicmgr(params);
            await manager.startRecording();
            manager.stopRecording();

            expect(mockAudioTrack.stop).toHaveBeenCalled();
            expect(mockStream.removeTrack).toHaveBeenCalled();
        });
    });

    describe('State Management', () => {
        it('should handle valid state transitions', async () => {
            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockAudioElement
            };

            const manager = jfmicmgr(params);
            let stateChange: EMicMgrStates="Uninitialized";
            
            manager.onStateChange((state) => {
                stateChange=state
            });

            await manager.getMicrophoneList(); // Should transition to Idle
            await manager.startRecording(); // Should transition to Recording
            manager.stopRecording(); // Should transition back to Idle

            expect(stateChange).toEqual('Idle');
        });

        it('should handle stream errors appropriately', async () => {
            mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

            const params: IJFMicMgrParams = {
                rootElememt: mockRootElement,
                audioStreamTarget: mockAudioElement
            };

            const manager = jfmicmgr(params);
            await expect(manager.startRecording()).rejects.toThrow('Permission denied');
        });
    });
});
