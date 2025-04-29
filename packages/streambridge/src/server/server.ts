import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors"; // Import the CORS middleware
// import ffmpeg from "fluent-ffmpeg";
// import { Readable } from "stream";

interface PCMBufferChunk {
    sampleRate: number;
    channelCount: number;
    buffer: Array<number>;
}


const app = express();
const corsOrigins = [
    "http://localhost",
    "http://localhost:8080", 
    "http://localhost:8088",
];

// Enable CORS for any localhost
app.use(cors({
    origin: corsOrigins,
    optionsSuccessStatus: 200,
}));

app.use("/", express.static(path.join(__dirname, "../../public")));

export const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
    },
});

// Socket.IO connection handler
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

            // Simplified audioInput handler without rate limiting
            socket.on('audio-data', async (audioData: PCMBufferChunk) => {
                try {
                    console.log(audioData)
                    // throw new Error("Not implemented");
                    const audioBuffer = Buffer.from(audioData.buffer);
                    console.log('Received audio data:', audioBuffer);
                    // Convert base64 string to Buffer
                    // const audioBuffer = typeof audioData === 'string'
                    //     ? Buffer.from(audioData, 'base64')
                    //     : Buffer.from(audioData);
    
                    // Stream the audio
                    // await session.streamAudio(audioBuffer);

    
                } catch (error) {
                    console.error('Error processing audio:', error);
                    socket.emit('error', {
                        message: 'Error processing audio',
                        details: error instanceof Error ? error.message : String(error)
                    });
                }
            });

    socket.emit("test", "testing string");
    // ...
});

// Shutdown server logic
const shutdownServer = async () => {
    console.log("Shutting down server...");

    const forceExitTimer = setTimeout(() => {
        console.error("Forcing server shutdown after timeout");
        process.exit(1);
    }, 5000);

    try {
        await new Promise((resolve) => io.close(resolve));
        console.log("Socket.IO server closed");

        await new Promise((resolve) => httpServer.close(resolve));
        clearTimeout(forceExitTimer);
        console.log("Server shut down");
        process.exit(0);
    } catch (error) {
        console.error("Error during server shutdown:", error);
        process.exit(1);
    }
};

app.get("/health", (_, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    shutdownServer();
});

await httpServer.listen(
    8080,
    () =>
        console.log(
            "Stream Bridge listening on ",
            JSON.stringify(httpServer.address()),
        ),
);
