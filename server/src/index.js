import { WebSocketServer } from 'ws';
import MessageReceiver from './MessageReceiver.js';
import GameSessionManager from './GameSessionManager.js';

const wss = new WebSocketServer({ port: 8080 });

const gameSessionManager = new GameSessionManager();

wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.binaryType = 'arraybuffer';

    const messageReceiver = new MessageReceiver(gameSessionManager, ws);

    ws.on('message', (message) => {
        messageReceiver.handleMessage(message);
    });
});