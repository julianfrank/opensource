# @julianfrank/opensource

A collection of high-quality JavaScript libraries for web development, focusing on audio processing and management capabilities. This monorepo contains carefully crafted, well-documented, and thoroughly tested libraries that help developers build better web applications.

## Available Libraries

### 🎤 js-audio-tools

A comprehensive TypeScript library for managing microphone input, audio recording, and waveform visualization in web applications. The library provides a customizable UI component with microphone selection, recording controls, and real-time audio visualization.

**Key Features:**
- Microphone device selection and management
- Audio recording controls with start/stop functionality
- Real-time waveform visualization with configurable parameters
- Custom stream target support for advanced audio processing
- Fully customizable UI elements with theming support
- TypeScript support with comprehensive type definitions
- Responsive design with mobile device support

[📚 Detailed js-audio-tools Documentation](./packages/js-audio-tools/README.md)

## Installation

You can install the entire package or individual libraries using npm:

```bash
# Install the entire package
npm install @julianfrank/opensource
```

## Quick Start

```javascript
import { MicManager } from '@julianfrank/opensource';

// Create a new MicManager instance
const micManager = new MicManager({
    rootElement: document.getElementById('mic-container'),
    startButtonText: '🎙️ Start',
    stopButtonText: '⏹️ Stop',
    onStartRecording: (stream) => {
        console.log('Recording started', stream);
    },
    onStopRecording: () => {
        console.log('Recording stopped');
    }
});

// Initialize the UI with waveform visualization
micManager.createMicUI({
    waveform: {
        enabled: true,
        width: 300,
        height: 150
    }
});
```

## Documentation

Each library in this repository comes with its own detailed documentation:

- [js-audio-tools Documentation](./packages/js-audio-tools/README.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the ISC License - see the individual library documentation for details.

## Support

If you encounter any issues or have questions, please file an issue on our [GitHub Issues page](https://github.com/julianfrank/opensource/issues).

