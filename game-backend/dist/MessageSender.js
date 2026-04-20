import { CONTRACT_VERSION, encodeServerMessage } from "@saper/contracts";
import { WebSocket } from "ws";
export default class MessageSender {
    clients;
    onAllClientsDisconnected;
    constructor(onAllClientsDisconnected) {
        this.clients = new Set();
        this.onAllClientsDisconnected = onAllClientsDisconnected;
    }
    addClient(ws) {
        this.clients.add(ws);
        ws.on("close", () => this.removeClient(ws));
    }
    removeClient(ws) {
        this.clients.delete(ws);
        if (this.clients.size === 0) {
            this.onAllClientsDisconnected();
        }
    }
    broadcast(buffer) {
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(buffer);
            }
        });
    }
    sendConfirmation(ws, game) {
        const payload = encodeServerMessage({
            contractVersion: CONTRACT_VERSION,
            payload: {
                oneofKind: "connect",
                connect: {
                    gameId: game.gameId,
                    rows: game.rows,
                    cols: game.cols,
                    numBombs: game.numBombs
                }
            }
        });
        ws.send(payload);
    }
    sendReset() {
        const payload = encodeServerMessage({
            payload: {
                oneofKind: "reset",
                reset: {}
            }
        });
        this.broadcast(payload);
    }
    sendRevealTiles(tiles, client = null) {
        const payload = encodeServerMessage({
            payload: {
                oneofKind: "revealTiles",
                revealTiles: {
                    tiles
                }
            }
        });
        if (client) {
            client.send(payload);
            return;
        }
        this.broadcast(payload);
    }
    sendGameOver(state) {
        const payload = encodeServerMessage({
            payload: {
                oneofKind: "gameOver",
                gameOver: {
                    state
                }
            }
        });
        this.broadcast(payload);
    }
    sendError(client, code, message) {
        const payload = encodeServerMessage({
            payload: {
                oneofKind: "error",
                error: {
                    code,
                    message
                }
            }
        });
        client.send(payload);
    }
}
