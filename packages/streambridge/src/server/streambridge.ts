import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

interface WebSocketConnection {
    connectionId: string;
    audioStream?: any;
}

const connections: Map<string, WebSocketConnection> = new Map();

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const routeKey = event.requestContext.routeKey;

    try {
        switch (routeKey) {
            case "$connect":
                // Store new connection
                connections.set(connectionId, { connectionId });
                return { statusCode: 200, body: "Connected" };

            case "$disconnect":
                // Remove connection
                connections.delete(connectionId);
                return { statusCode: 200, body: "Disconnected" };

            case "$default":
                // Handle incoming audio stream chunks
                const connection = connections.get(connectionId);
                if (!connection) {
                    return { statusCode: 400, body: "Connection not found" };
                }

                // Process binary audio data

                // Process binary audio data
                const audioChunk = event.body;
                if (audioChunk) {
                    // Convert audio chunk to Buffer
                    const audioBuffer = Buffer.from(audioChunk, "base64");

                    // Format for Bedrock Claude Sonic
                    // Audio must be: 16kHz sample rate, 16-bit PCM, single channel WAV
                    // Function to detect audio format and transform to Bedrock Nova Sonic compatible buffer
                    function transformToSonicBuffer(
                        audioChunk: string,
                    ): any {
                        // Convert base64 audio chunk to Buffer
                        const audioBuffer = Buffer.from(
                            audioChunk,
                            "base64",
                        );

                        // Here you would add logic to detect audio format, sample rate and channels
                        // This is a simplified example - you would need to implement proper audio analysis
                        const detectedFormat = detectAudioFormat(
                            audioBuffer,
                        );
                        const detectedSampleRate = detectSampleRate(
                            audioBuffer,
                        );
                        const detectedChannels = detectChannels(
                            audioBuffer,
                        );

                        // Convert audio to required format if needed
                        // Bedrock Nova Sonic requires:
                        // - 16kHz sample rate
                        // - 16-bit PCM
                        // - Single channel
                        const convertedBuffer = convertAudioFormat(
                            audioBuffer,
                            {
                                targetSampleRate: 16000,
                                targetChannels: 1,
                                targetFormat: "pcm",
                            },
                        );

                        // Format for Bedrock Nova Sonic
                        const sonicCompatibleBuffer = {
                            inputAudio: {
                                data: convertedBuffer,
                                format: "pcm",
                                sampling_rate: 16000,
                                channel_count: 1,
                            },
                        };

                        return sonicCompatibleBuffer;
                    }

                    // Helper function to detect audio format from buffer
                    function detectAudioFormat(buffer: Buffer): string {
                        // Check WAV header
                        if (
                            buffer.length >= 12 &&
                            buffer.toString("ascii", 0, 4) === "RIFF" &&
                            buffer.toString("ascii", 8, 12) === "WAVE"
                        ) {
                            return "wav";
                        }

                        // Check MP3 header
                        if (
                            buffer.length >= 3 &&
                            buffer[0] === 0xFF &&
                            (buffer[1] & 0xE0) === 0xE0
                        ) {
                            return "mp3";
                        }

                        // Check AAC header
                        if (
                            buffer.length >= 2 &&
                            buffer[0] === 0xFF &&
                            (buffer[1] & 0xF0) === 0xF0
                        ) {
                            return "aac";
                        }

                        // Check FLAC header
                        if (
                            buffer.length >= 4 &&
                            buffer.toString("ascii", 0, 4) === "fLaC"
                        ) {
                            return "flac";
                        }

                        // Default to PCM if no known headers detected
                        return "pcm"; // This is placeholder implementation
                    }

                    // Helper function to detect sample rate
                    function detectSampleRate(buffer: Buffer): number {
                        // For WAV files, sample rate is stored in bytes 24-27
                        if (
                            buffer.length >= 28 &&
                            buffer.toString("ascii", 0, 4) === "RIFF"
                        ) {
                            return buffer.readUInt32LE(24);
                        }

                        // For MP3, sample rate is encoded in frame header
                        // Check for valid MP3 frame header
                        if (
                            buffer.length >= 4 && buffer[0] === 0xFF &&
                            (buffer[1] & 0xE0) === 0xE0
                        ) {
                            // Sample rate index is in bits 10-11 of second header byte
                            const srIndex = (buffer[2] >> 2) & 0x03;
                            // MP3 sample rate table (MPEG1, Layer I & II)
                            const srTable = [44100, 48000, 32000];
                            return srTable[srIndex] || 44100;
                        }

                        // For AAC, sample rate is in ADTS header
                        if (
                            buffer.length >= 7 && buffer[0] === 0xFF &&
                            (buffer[1] & 0xF0) === 0xF0
                        ) {
                            // Sample rate index is in bits 2-5 of third header byte
                            const srIndex = (buffer[2] >> 2) & 0x0F;
                            // AAC sample rate table
                            const srTable = [
                                96000,
                                88200,
                                64000,
                                48000,
                                44100,
                                32000,
                                24000,
                                22050,
                                16000,
                                12000,
                                11025,
                                8000,
                            ];
                            return srTable[srIndex] || 44100;
                        }

                        // Default to 44100 if format not detected
                        return 44100; // This is placeholder implementation
                    }

                    // Helper function to detect number of channels
                    function detectChannels(buffer: Buffer): number {
                        // For WAV files, number of channels is stored in bytes 22-23
                        if (
                            buffer.length >= 24 &&
                            buffer.toString("ascii", 0, 4) === "RIFF"
                        ) {
                            return buffer.readUInt16LE(22);
                        }

                        // For MP3, channel info is in frame header
                        if (
                            buffer.length >= 4 && buffer[0] === 0xFF &&
                            (buffer[1] & 0xE0) === 0xE0
                        ) {
                            // Channel mode is in bits 6-7 of third header byte
                            const channelMode = (buffer[3] >> 6) & 0x03;
                            // 0b11 = mono, others = stereo
                            return channelMode === 0x03 ? 1 : 2;
                        }

                        // For AAC, channel info is in ADTS header
                        if (
                            buffer.length >= 4 && buffer[0] === 0xFF &&
                            (buffer[1] & 0xF0) === 0xF0
                        ) {
                            // Channel configuration is in bits 2-3 of third byte and bit 7 of fourth byte
                            const channelConfig = ((buffer[2] & 0x01) << 2) |
                                ((buffer[3] >> 6) & 0x03);
                            return channelConfig || 2; // Default to 2 if 0
                        }

                        // Default to stereo if format not detected
                        return 2; // This is placeholder implementation
                    }

                    // Helper function to convert audio format
                    function convertAudioFormat(buffer: Buffer, options: {
                        targetSampleRate: number;
                        targetChannels: number;
                        targetFormat: string;
                    }): Buffer {
                        // Import required ffmpeg libraries

                        // Add logic to convert audio format, sample rate and channels
                        const inputStream = new Readable();
                        inputStream.push(buffer);
                        inputStream.push(null);

                        return new Promise((resolve, reject) => {
                            const chunks: Buffer[] = [];

                            ffmpeg(inputStream)
                                .toFormat("wav")
                                .audioChannels(options.targetChannels)
                                .audioFrequency(options.targetSampleRate)
                                .on("error", (err) => {
                                    reject(err);
                                })
                                .on("data", (chunk) => {
                                    chunks.push(chunk);
                                })
                                .on("end", () => {
                                    resolve(Buffer.concat(chunks));
                                })
                                .pipe();
                        }); // This would use audio processing libraries like ffmpeg
                    }
                    const sonicCompatibleBuffer = {
                        inputAudio: {
                            data: audioBuffer,
                            format: "pcm",
                            sampling_rate: 16000,
                            channel_count: 1,
                        },
                    };

                    connection.audioStream = sonicCompatibleBuffer;
                }
                connection.audioStream = audioChunk;

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Audio chunk received" }),
                };

            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Unknown route" }),
                };
        }
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};
