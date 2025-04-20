# Julian Frank's Open Source Libraries

Welcome to the collection of open-source libraries developed by Julian Frank. This repository hosts a set of high-quality, well-documented TypeScript/JavaScript libraries designed to solve common web development challenges.

## Overview

This monorepo contains various packages that can be used independently or together in your web applications. Each library is designed with a focus on performance, type safety, and developer experience.

## Available Libraries

### MicManager

A comprehensive TypeScript library for managing microphone input, audio recording, and waveform visualization in web applications. It provides a customizable UI component with microphone selection, recording controls, and real-time audio visualization.

- [Documentation](/packages/mic_manager/README.md)
- Features:
  - 🎤 Microphone device selection and management
  - 🎚️ Audio recording controls with start/stop functionality
  - 📊 Real-time waveform visualization with configurable parameters
  - 🎯 Custom stream target support for advanced audio processing
  - 🎨 Fully customizable UI elements with theming support

## Installation

You can install all libraries or individual packages:

```bash
# Install all libraries
npm install @julianfrank/opensource
```

## Usage

```javascript
// Import the entire collection
import JFLibs from '@julianfrank/opensource';

// Use a specific library
const micManager = new JFLibs.MicManager({
  rootElement: document.getElementById('mic-container')
});

// Or import a specific library directly
import { MicManager } from '@julianfrank/opensource';
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

## Author

Julian Frank - [GitHub](https://github.com/julianfrank)