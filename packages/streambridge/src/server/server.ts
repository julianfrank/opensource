import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

app.use("/",express.static(path.join(__dirname, "../../public")));

const httpServer = createServer(app);
const io = new Server(httpServer, {/* options */});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create a unique session ID for this client
  const sessionId = socket.id;

  try {
      // Create session with the new API
      const session = bedrockClient.createStreamSession(sessionId);
      bedrockClient.initiateSession(sessionId)

      setInterval(() => {
          const connectionCount = Object.keys(io.sockets.sockets).length;
          console.log(`Active socket connections: ${connectionCount}`);
      }, 60000);

      // Set up event handlers
      session.onEvent('contentStart', (data) => {
          console.log('contentStart:', data);
          socket.emit('contentStart', data);
      });

      session.onEvent('textOutput', (data) => {
          console.log('Text output:', data);
          socket.emit('textOutput', data);
      });

      session.onEvent('audioOutput', (data) => {
          //console.log('Audio output received, sending to client');
          socket.emit('audioOutput', data);
      });

      session.onEvent('error', (data) => {
          console.error('Error in session:', data);
          socket.emit('error', data);
      });

      session.onEvent('toolUse', (data) => {
          console.log('Tool use detected:', data.toolName);
          socket.emit('toolUse', data);
      });

      session.onEvent('toolResult', (data) => {
          console.log('Tool result received');
          socket.emit('toolResult', data);
      });

      session.onEvent('contentEnd', (data) => {
          console.log('Content end received', data);
          socket.emit('contentEnd', data);
      });

      session.onEvent('streamComplete', () => {
          console.log('Stream completed for client:', socket.id);
          socket.emit('streamComplete');
      });

      // Simplified audioInput handler without rate limiting
      socket.on('audioInput', async (audioData) => {
          try {
              // Convert base64 string to Buffer
              const audioBuffer = typeof audioData === 'string'
                  ? Buffer.from(audioData, 'base64')
                  : Buffer.from(audioData);

              // Stream the audio
              await session.streamAudio(audioBuffer);

          } catch (error) {
              console.error('Error processing audio:', error);
              socket.emit('error', {
                  message: 'Error processing audio',
                  details: error instanceof Error ? error.message : String(error)
              });
          }
      });

      socket.on('promptStart', async () => {
          try {
              console.log('Prompt start received');
              await session.setupPromptStart();
          } catch (error) {
              console.error('Error processing prompt start:', error);
              socket.emit('error', {
                  message: 'Error processing prompt start',
                  details: error instanceof Error ? error.message : String(error)
              });
          }
      });

      socket.on('systemPrompt', async (data) => {
          try {
              console.log('System prompt received', data);
              await session.setupSystemPrompt(undefined, data);
          } catch (error) {
              console.error('Error processing system prompt:', error);
              socket.emit('error', {
                  message: 'Error processing system prompt',
                  details: error instanceof Error ? error.message : String(error)
              });
          }
      });

      // Here we are sending the conversation history to resume the conversation
      // This set of events need to be sent after system prompt before audio stream starts
      socket.on('conversationResumption', async () => {
          try {
              console.log('Resume conversation for Don Smith, check in date is 2025-05-15');
              // USER: hi there i would like to cancel my hotel reservation
              // ASSISTANT: Hello! I'd be happy to assist you with cancelling your hotel reservation. To get started, could you please provide me with your full name and the check-in date for your reservation?
              // USER: yeah so my name is don smith
              // ASSISTANT: Thank you, Don. Now, could you please provide me with the check-in date for your reservation?
              // USER: yes so um let me check just a second
              // ASSISTANT: Take your time, Don. I'll be here when you're ready.

              // USER needs to start the conversation with checkin date; checkin date for Don is May 15, 2025


              await session.setupHistoryForConversationResumtion(undefined, "hi there i would like to cancel my hotel reservation", "USER");
              await session.setupHistoryForConversationResumtion(undefined, "Hello! I'd be happy to assist you with cancelling your hotel reservation. To get started, could you please provide me with your full name and the check-in date for your reservation?", "ASSISTANT");
              await session.setupHistoryForConversationResumtion(undefined, "yeah so my name is don smith", "USER");
              await session.setupHistoryForConversationResumtion(undefined, "Thank you, Don. Now, could you please provide me with the check-in date for your reservation?", "ASSISTANT");
              await session.setupHistoryForConversationResumtion(undefined, "yes so um let me check just a second", "USER");
              await session.setupHistoryForConversationResumtion(undefined, "Take your time, Don. I'll be here when you're ready.", "ASSISTANT");


          } catch (error) {
              console.error('Error processing system prompt:', error);
              socket.emit('error', {
                  message: 'Error processing system prompt',
                  details: error instanceof Error ? error.message : String(error)
              });
          }
      });

      socket.on('audioStart', async (data) => {
          try {
              console.log('Audio start received', data);
              await session.setupStartAudio();
          } catch (error) {
              console.error('Error processing audio start:', error);
              socket.emit('error', {
                  message: 'Error processing audio start',
                  details: error instanceof Error ? error.message : String(error)
              });
          }
      });

      socket.on('stopAudio', async () => {
          try {
              console.log('Stop audio requested, beginning proper shutdown sequence');

              // Chain the closing sequence
              await Promise.all([
                  session.endAudioContent()
                      .then(() => session.endPrompt())
                      .then(() => session.close())
                      .then(() => console.log('Session cleanup complete'))
              ]);
          } catch (error) {
              console.error('Error processing streaming end events:', error);
              socket.emit('error', {
                  message: 'Error processing streaming end events',
                  details: error instanceof Error ? error.message : String(error)
              });
          }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
          console.log('Client disconnected abruptly:', socket.id);

          if (bedrockClient.isSessionActive(sessionId)) {
              try {
                  console.log(`Beginning cleanup for abruptly disconnected session: ${socket.id}`);

                  // Add explicit timeouts to avoid hanging promises
                  const cleanupPromise = Promise.race([
                      (async () => {
                          await session.endAudioContent();
                          await session.endPrompt();
                          await session.close();
                      })(),
                      new Promise((_, reject) =>
                          setTimeout(() => reject(new Error('Session cleanup timeout')), 3000)
                      )
                  ]);

                  await cleanupPromise;
                  console.log(`Successfully cleaned up session after abrupt disconnect: ${socket.id}`);
              } catch (error) {
                  console.error(`Error cleaning up session after disconnect: ${socket.id}`, error);
                  try {
                      bedrockClient.forceCloseSession(sessionId);
                      console.log(`Force closed session: ${sessionId}`);
                  } catch (e) {
                      console.error(`Failed even force close for session: ${sessionId}`, e);
                  }
              } finally {
                  // Make sure socket is fully closed in all cases
                  if (socket.connected) {
                      socket.disconnect(true);
                  }
              }
          }
      });

  } catch (error) {
      console.error('Error creating session:', error);
      socket.emit('error', {
          message: 'Failed to initialize session',
          details: error instanceof Error ? error.message : String(error)
      });
      socket.disconnect();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
