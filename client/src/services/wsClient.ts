import {
  decodeServerMessage,
  type TileCoordinates,
  type ServerMessage
} from "@saper/contracts";
import type { CreateGameRequest, JoinGameRequest } from "../../../shared/contracts/src/generated/game.js";
import log from "@/services/logger";
import {
  createGamePayload,
  createFlagTilePayload,
  joinGamePayload,
  createResetPayload,
  createRevealTilePayload
} from "@/services/wsProtocol";
import { createCursorClickPayload } from "@/services/wsCursorProtocol";

const DEV_WS_URL = "ws://localhost:8085";

const resolveWebSocketUrl = (): string => {
  if (import.meta.env.DEV) {
    return DEV_WS_URL;
  }

  const buildTimeWsUrl = import.meta.env.VITE_WS_URL?.trim();
  return buildTimeWsUrl || DEV_WS_URL;
};

const waitForOpenSocket = async (socket: WebSocket): Promise<void> => {
  await new Promise<void>((resolve) => {
    if (socket.readyState !== socket.OPEN) {
      socket.addEventListener("open", () => resolve(), { once: true });
      return;
    }

    resolve();
  });
};

class WsClient {
  private socket: WebSocket | undefined;
  private onServerMessage: ((message: ServerMessage) => void) | undefined;

  async createGame(request: CreateGameRequest, onServerMessage: (message: ServerMessage) => void): Promise<void> {
    await this.connectSocket(onServerMessage);
    this.send(createGamePayload(request));
  }

  async joinGame(request: JoinGameRequest, onServerMessage: (message: ServerMessage) => void): Promise<void> {
    await this.connectSocket(onServerMessage);
    this.send(joinGamePayload(request));
  }

  private async connectSocket(onServerMessage: (message: ServerMessage) => void): Promise<void> {
    this.disconnect();

    this.socket = new WebSocket(resolveWebSocketUrl());
    this.onServerMessage = onServerMessage;
    await waitForOpenSocket(this.socket);

    this.socket.binaryType = "arraybuffer";
    this.setupSocketHandlers();
  }

  disconnect(): void {
    this.onServerMessage = undefined;

    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }

  revealTiles(tiles: TileCoordinates[]): void {
    if (tiles.length === 0) {
      return;
    }

    this.send(createRevealTilePayload(tiles));
  }

  flagTile(tile: TileCoordinates, unflag: boolean): void {
    this.send(createFlagTilePayload(tile.y, tile.x, unflag));
  }

  sendCursorClick(tile: TileCoordinates): void {
    this.send(createCursorClickPayload(tile));
  }

  sendReset(): void {
    this.send(createResetPayload());
  }

  private send(payload: Uint8Array<ArrayBufferLike>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(new Uint8Array(payload));
  }

  private setupSocketHandlers(): void {
    if (!this.socket) {
      return;
    }

    this.socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      try {
        const message = decodeServerMessage(new Uint8Array(event.data));
        this.onServerMessage?.(message);
      } catch (error) {
        log.error("[client] Failed to decode server message.", error);
      }
    };

    this.socket.onclose = () => {
      log.warn("[client] WebSocket closed.");
    };

    this.socket.onerror = (event) => {
      log.error("[client] WebSocket error event.", event);
    };
  }
}

export { WsClient };
export const wsClient = new WsClient();
