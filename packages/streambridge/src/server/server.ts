import express from "express";
import path from "path";
import { createServer } from "http";
import io from "./io.ts";

const app = express();

app.use("/", express.static(path.join(__dirname, "../../public")));

export const httpServer = createServer(app);

const shutdownServer = async () => {
    console.log("Shutting down server...");

    const forceExitTimer = setTimeout(() => {
        console.error("Forcing server shutdown after timeout");
        process.exit(1);
    }, 5000);

    try {
        // First close Socket.IO server which manages WebSocket connections
        await new Promise((resolve) => io.close(resolve));
        console.log("Socket.IO server closed");

        // Then close all active sessions
        // const activeSessions = bedrockClient.getActiveSessions();
        // console.log(`Closing ${activeSessions.length} active sessions...`);

        // await Promise.all(activeSessions.map(async (sessionId) => {
        //     try {
        //         await bedrockClient.closeSession(sessionId);
        //         console.log(`Closed session ${sessionId} during shutdown`);
        //     } catch (error) {
        //         console.error(
        //             `Error closing session ${sessionId} during shutdown:`,
        //             error,
        //         );
        //         bedrockClient.forceCloseSession(sessionId);
        //     }
        // }));

        // Now close the HTTP server with a promise
        await new Promise((resolve) => httpServer.close(resolve));
        clearTimeout(forceExitTimer);
        console.log("Server shut down");
        process.exit(0);
    } catch (error) {
        console.error("Error during server shutdown:", error);
        process.exit(1);
    }
};

process.on("SIGINT", shutdownServer);
process.on("SIGBREAK", shutdownServer);

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    shutdownServer();
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

await httpServer.listen(
    8080,
    () =>
        console.log(
            "Stream Bridge listening on ",
            JSON.stringify(httpServer.address()),
        ),
);
