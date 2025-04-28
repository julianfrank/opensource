import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

app.use("/",express.static(path.join(__dirname, "../../public")));

const httpServer = createServer(app);
const io = new Server(httpServer, {/* options */});

io.on("connection", (socket) => {
  // ...
});

await httpServer.listen(
  8080,
  () => console.log("CAI Bridge listening on *:8080"),
);

process.once("SIGINT", function (code) {
  console.log("SIGINT received with code ", code);
  httpServer.close();
  process.exit()
});

// vs.

process.once("SIGTERM", function (code) {
  console.log("SIGTERM received with Code ", code);
  httpServer.close();
  process.exit()
});
