import {
  NEW_GAME_ID,
  decodeServerMessage,
  type TileCoordinates,
  type ServerMessage
} from "@saper/contracts";
import log from "@/services/logger";
import {
  createConnectPayload,
  createFlagTilePayload,
  createResetPayload,
  createRevealTilePayload
} from "@/services/wsProtocol";

export type ConnectParams = {
  boardHeight: number;
  boardWidth: number;
  gameId: string;
  numBombs: number;
  connectionType: "create" | "join";
  onServerMessage: (message: ServerMessage) => void;
};

export type TransportClient = {
  connect(params: ConnectParams): Promise<void>;
  disconnect(): void;
  revealTiles(tiles: TileCoordinates[]): void;
  flagTile(tile: TileCoordinates, unflag: boolean): void;
  sendReset(): void;
};

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

class WsClient implements TransportClient {
  private socket: WebSocket | undefined;
  private onServerMessage: ((message: ServerMessage) => void) | undefined;

  async connect(params: ConnectParams): Promise<void> {
    this.disconnect();

    const resolvedGameId =
      params.connectionType === "join" ? Number(params.gameId) : NEW_GAME_ID;

    this.socket = new WebSocket(resolveWebSocketUrl());
    this.onServerMessage = params.onServerMessage;
    await waitForOpenSocket(this.socket);

    this.socket.binaryType = "arraybuffer";
    this.setupSocketHandlers();

    this.send(createConnectPayload(resolvedGameId, params.boardHeight, params.boardWidth, params.numBombs));
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

export const wsClient = new WsClient();
