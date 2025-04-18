# MicManager Documentation

The MicManager is a TypeScript library that provides a comprehensive interface for managing microphone input, audio recording, and waveform visualization in web applications. It offers a customizable UI component with microphone selection, recording controls, and real-time audio visualization.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Architecture](#architecture)
- [Interfaces](#interfaces)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Error Handling](#error-handling)

## Features

- 🎤 Microphone device selection and management
- 🎚️ Audio recording controls with start/stop functionality
- 📊 Real-time waveform visualization
- 🎯 Custom stream target support
- 🎨 Customizable UI elements
- 🔄 Automatic microphone list updates
- ⚡ Efficient event handling and cleanup

## Installation

```bash
npm install js-audio-tools
```

## Basic Usage

```typescript
import { MicManager } from 'js-audio-tools';

// Create a new MicManager instance
const micManager = new MicManager({
    rootElement: document.getElementById('mic-container'),
    startButtonText: '🎙️',
    stopButtonText: '🛑',
    onStartRecording: (stream) => {
        console.log('Recording started', stream);
    },
    onStopRecording: () => {
        console.log('Recording stopped');
    }
});

// Create the UI
micManager.createMicUI({
    waveform: {
        enabled: true,
        width: 300,
        height: 150,
        backgroundColor: '#000000',
        waveformColor: '#00ff00'
    }
});
```

## Architecture

```mermaid
classDiagram
    class MicManager {
        -stream: MediaStream
        -rootElement: HTMLElement
        -elements: MicUIElements
        -streamTarget: StreamTarget
        +constructor(params: MicUIParameters)
        +createMicUI(params: MicUIParameters)
        +setStreamTarget(target: StreamTarget)
        +clearStreamTarget()
        +getMicrophoneList()
        +dispose()
    }

    class StreamTarget {
        <<interface>>
        +setStream(stream: MediaStream)
        +start()?
        +stop()?
        +onStreamStart()?
        +onStreamStop()?
        +onStreamError(error: Error)?
    }

    class MicUIElements {
        <<interface>>
        +micWidget: HTMLDivElement
        +micSettingsContainer: HTMLDivElement
        +settingsButton: HTMLDivElement
        +micList: HTMLSelectElement
        +startButton: HTMLDivElement
        +stopButton: HTMLDivElement
        +audioElement: HTMLAudioElement
        +waveformCanvas?: HTMLCanvasElement
        +waveformContainer?: HTMLDivElement
    }

    MicManager --> StreamTarget : uses
    MicManager --> MicUIElements : creates
```

## Interfaces

### MicUIParameters

```typescript
interface MicUIParameters {
    rootElement?: HTMLElement;              // Container element for the UI
    streamTarget?: StreamTarget;            // Custom audio stream handler
    onMicListChange?: (mics: Microphone[]) => void;  // Microphone list update callback
    onStartRecording?: (stream: MediaStream) => void; // Recording start callback
    onStopRecording?: () => void;          // Recording stop callback
    onAudioElementChange?: (audio: HTMLAudioElement) => void;
    onAudioElementError?: (error: Error) => void;
    startButtonText?: string;               // Custom start button text
    stopButtonText?: string;                // Custom stop button text
    waveform?: WaveformConfig;             // Waveform visualization config
}
```

### StreamTarget

```typescript
interface StreamTarget {
    // Required method
    setStream(stream: MediaStream | null): void;
    
    // Optional methods
    start?(): void;
    stop?(): void;
    
    // Optional event handlers
    onStreamStart?(): void;
    onStreamStop?(): void;
    onStreamError?(error: Error): void;
}
```

### WaveformConfig

```typescript
interface WaveformConfig {
    enabled?: boolean;           // Enable/disable waveform visualization
    width?: number;             // Canvas width in pixels
    height?: number;            // Canvas height in pixels
    resolution?: number;        // FFT size / 2
    refreshRate?: number;       // Updates per second
    backgroundColor?: string;   // Canvas background color
    waveformColor?: string;    // Waveform line color
}
```

### Microphone

```typescript
interface Microphone {
    deviceId: string;   // Unique device identifier
    label: string;      // Human-readable device name
}
```

## API Reference

### Constructor

```typescript
constructor(params: MicUIParameters)
```

Creates a new MicManager instance. Only one instance can exist at a time.

### Methods

#### createMicUI

```typescript
createMicUI(params: MicUIParameters): MicUIElements
```

Creates and returns the UI elements for microphone management.

#### setStreamTarget

```typescript
setStreamTarget(target: StreamTarget): void
```

Sets a custom stream target for handling the audio stream.

#### clearStreamTarget

```typescript
clearStreamTarget(): void
```

Removes the custom stream target and reverts to using the default audio element.

#### getMicrophoneList

```typescript
async getMicrophoneList(): Promise<Microphone[]>
```

Returns a list of available microphone devices.

#### dispose

```typescript
dispose(): void
```

Cleans up resources and removes UI elements.

## Examples

### Basic Recording with Waveform

```typescript
const micManager = new MicManager({
    rootElement: document.getElementById('mic-container')
});

const ui = micManager.createMicUI({
    startButtonText: '🎙️ Start',
    stopButtonText: '⏹️ Stop',
    waveform: {
        enabled: true,
        width: 300,
        height: 150,
        resolution: 32,
        refreshRate: 30,
        backgroundColor: '#000000',
        waveformColor: '#00ff00'
    },
    onStartRecording: (stream) => {
        console.log('Recording started');
    },
    onStopRecording: () => {
        console.log('Recording stopped');
    }
});
```

### Custom Stream Target

```typescript
class AudioProcessor implements StreamTarget {
    private audioContext: AudioContext;
    private processor: ScriptProcessorNode;

    constructor() {
        this.audioContext = new AudioContext();
    }

    setStream(stream: MediaStream | null): void {
        if (stream) {
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.processor);
        }
    }

    start(): void {
        console.log('Processing started');
    }

    stop(): void {
        console.log('Processing stopped');
    }

    onStreamError(error: Error): void {
        console.error('Stream error:', error);
    }
}

const micManager = new MicManager({
    rootElement: document.getElementById('mic-container'),
    streamTarget: new AudioProcessor()
});

micManager.createMicUI({
    waveform: { enabled: true }
});
```

## Error Handling

The MicManager provides custom error types for better error handling:

```typescript
// Base error type
class MicManagerError extends Error {
    name = "MicManagerError";
}

// Stream-related errors
class StreamError extends MicManagerError {
    name = "StreamError";
}

// Device-related errors
class DeviceError extends MicManagerError {
    name = "DeviceError";
}

// Error handling example
try {
    await micManager.startRecording();
} catch (error) {
    if (error instanceof StreamError) {
        console.error('Stream error:', error.message);
    } else if (error instanceof DeviceError) {
        console.error('Device error:', error.message);
    } else {
        console.error('Unknown error:', error);
    }
}
```

## Best Practices

1. **Singleton Usage**: Only one MicManager instance should exist at a time.
2. **Resource Cleanup**: Always call `dispose()` when the MicManager is no longer needed.
3. **Error Handling**: Implement proper error handling using the provided error types.
4. **Stream Target**: Use custom stream targets for advanced audio processing.
5. **Waveform Configuration**: Adjust waveform settings based on performance requirements.

## Browser Support

MicManager requires browsers that support:
- `MediaDevices` API
- `getUserMedia`
- Web Audio API
- Canvas API

Most modern browsers (Chrome, Firefox, Safari, Edge) support these features.