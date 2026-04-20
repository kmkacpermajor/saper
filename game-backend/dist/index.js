import { WebSocketServer } from "ws";
import MessageReceiver from "./MessageReceiver.js";
import GameSessionManager from "./GameSessionManager.js";
import { logger } from "./logger.js";
const host = process.env.HOST || "0.0.0.0";
const parsedPort = Number(process.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 8085;
const wss = new WebSocketServer({ host, port });
const gameSessionManager = new GameSessionManager();
logger.debug(`[server] Log level: ${logger.level}`);
logger.info(`[server] WebSocket server started on ws://${host}:${port}`);
wss.on("connection", (ws) => {
    const clientTag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    logger.debug(`[server] Client connected: ${clientTag}`);
    ws.binaryType = "arraybuffer";
    const messageReceiver = new MessageReceiver(gameSessionManager, ws);
    ws.on("message", (message) => {
        messageReceiver.handleMessage(message);
    });
    ws.on("close", () => {
        logger.debug(`[server] Client disconnected: ${clientTag}`);
    });
    ws.on("error", (error) => {
        logger.error({ err: error }, `[server] Client socket error (${clientTag})`);
    });
});
