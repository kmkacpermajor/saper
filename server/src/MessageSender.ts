import { CONTRACT_VERSION, GameState, encodeServerMessage, type TileUpdate } from "@saper/contracts";
import { WebSocket } from "ws";
import type Game from "./Game.js";

export default class MessageSender {
  private readonly clients: Set<WebSocket>;
  private readonly onAllClientsDisconnected: () => void;

  constructor(onAllClientsDisconnected: () => void) {
    this.clients = new Set<WebSocket>();
    this.onAllClientsDisconnected = onAllClientsDisconnected;
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    ws.on("close", () => this.removeClient(ws));
  }

  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    if (this.clients.size === 0) {
      this.onAllClientsDisconnected();
    }
  }

  private broadcast(buffer: Uint8Array): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(buffer);
      }
    });
  }

  sendConfirmation(ws: WebSocket, game: Game): void {
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

  sendReset(): void {
    const payload = encodeServerMessage({
      payload: {
        oneofKind: "reset",
        reset: {}
      }
    });
    this.broadcast(payload);
  }

  sendRevealTiles(tiles: TileUpdate[], client: WebSocket | null = null): void {
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

  sendGameOver(state: GameState): void {
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

  sendError(client: WebSocket, code: string, message: string): void {
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
