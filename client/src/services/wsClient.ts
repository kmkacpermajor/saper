import {
  GameState,
  NEW_GAME_ID,
  TileType,
  decodeServerMessage,
  type ServerMessage
} from "@saper/contracts";
import log from "loglevel";
import Minesweeper from "@/game/minesweeper";
import {
  createConnectPayload,
  createFlagTilePayload,
  createResetPayload,
  createRevealTilePayload
} from "@/game/minesweeperProtocol";
import type { GameEvent } from "@/stores/gameStore";

type ConnectParams = {
  boardHeight: number;
  boardWidth: number;
  gameId: string;
  numBombs: number;
  connectionType: "create" | "join";
  onGameEvent: (event: GameEvent) => void;
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

const isTileType = (value: number): value is TileType =>
  Number.isInteger(value) && value >= TileType.HIDDEN && value <= TileType.EIGHT;

class WsClient {
  private gameInstance: Minesweeper | undefined;
  private socket: WebSocket | undefined;

  async connect(params: ConnectParams): Promise<HTMLCanvasElement> {
    this.disconnect();

    const resolvedGameId =
      params.connectionType === "join" ? Number(params.gameId) : NEW_GAME_ID;

    this.socket = new WebSocket("ws://localhost:8085");
    this.gameInstance = new Minesweeper(resolvedGameId, params.onGameEvent, {
      revealTile: (y, x) => {
        this.send(createRevealTilePayload(y, x));
      },
      flagTile: (y, x, unflag) => {
        this.send(createFlagTilePayload(y, x, unflag));
      }
    });

    await this.gameInstance.init();
    await waitForOpenSocket(this.socket);

    this.socket.binaryType = "arraybuffer";
    this.setupSocketHandlers();

    this.send(createConnectPayload(resolvedGameId, params.boardHeight, params.boardWidth, params.numBombs));

    return this.gameInstance.app.canvas;
  }

  disconnect(): void {
    if (this.gameInstance) {
      this.gameInstance.app.stop();
      this.gameInstance.cleanup();
      this.gameInstance.app.destroy(true, {
        children: true,
        texture: true
      });
      this.gameInstance = undefined;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }

  sendReset(): void {
    this.send(createResetPayload());
  }

  private send(payload: Uint8Array): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(payload);
  }

  private setupSocketHandlers(): void {
    if (!this.socket) {
      return;
    }

    this.socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      try {
        const message = decodeServerMessage(new Uint8Array(event.data));
        this.handleServerMessage(message);
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

  private handleServerMessage(message: ServerMessage): void {
    if (!this.gameInstance) {
      return;
    }

    switch (message.payload.oneofKind) {
      case "connect": {
        const payload = message.payload.connect;
        this.gameInstance.applyConnected(payload.gameId, payload.rows, payload.cols, payload.numBombs);
        return;
      }
      case "revealTiles": {
        for (const tile of message.payload.revealTiles.tiles) {
          if (!isTileType(tile.type)) {
            continue;
          }

          if (tile.y >= this.gameInstance.rows || tile.x >= this.gameInstance.cols) {
            continue;
          }

          this.gameInstance.applyRevealTile(tile.y, tile.x, tile.type);
        }
        return;
      }
      case "gameOver": {
        this.gameInstance.applyGameOver(message.payload.gameOver.state as GameState);
        return;
      }
      case "reset": {
        this.gameInstance.applyReset();
        return;
      }
      case "error": {
        const errorPayload = message.payload.error;
        log.error(`[client] Server error: ${errorPayload.code} ${errorPayload.message}`);
        return;
      }
      default:
        log.warn("[client] Received server message with unsupported payload kind.");
    }
  }
}

export const wsClient = new WsClient();
