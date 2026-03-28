import { GameState, NEW_GAME_ID, TileType, type ServerMessage } from "@saper/contracts";
import log from "@/services/logger";
import type { GameEvent } from "@/game/gameEvents";
import GameController from "@/game/gameController";
import type { TransportClient } from "@/services/wsClient";

type SessionConnectParams = {
  boardHeight: number;
  boardWidth: number;
  gameId: string;
  numBombs: number;
  connectionType: "create" | "join";
};

const isTileType = (value: number): value is TileType =>
  Number.isInteger(value) && value >= TileType.HIDDEN && value <= TileType.EIGHT;

export default class GameSession {
  private controller: GameController | null = null;

  constructor(
    private readonly transportClient: TransportClient,
    private readonly onGameEvent: (event: GameEvent) => void
  ) {}

  async start(params: SessionConnectParams): Promise<HTMLCanvasElement> {
    this.stop();

    const resolvedGameId = params.connectionType === "join" ? Number(params.gameId) : NEW_GAME_ID;
    const controller = new GameController(resolvedGameId, this.onGameEvent, this.transportClient);

    try {
      await controller.init();

      await this.transportClient.connect({
        ...params,
        onServerMessage: this.createServerMessageHandler(controller)
      });

      this.controller = controller;
      return controller.app.canvas;
    } catch (error) {
      this.destroyController(controller);
      this.transportClient.disconnect();
      throw error;
    }
  }

  stop(): void {
    if (this.controller) {
      this.destroyController(this.controller);
      this.controller = null;
    }

    this.transportClient.disconnect();
  }

  reset(): void {
    this.transportClient.sendReset();
  }

  private createServerMessageHandler(
    controller: GameController
  ): (message: ServerMessage) => void {
    return (message: ServerMessage): void => {
      switch (message.payload.oneofKind) {
        case "connect": {
          const payload = message.payload.connect;
          controller.applyConnected(payload.gameId, payload.rows, payload.cols, payload.numBombs);
          return;
        }

        case "revealTiles": {
          for (const tile of message.payload.revealTiles.tiles) {
            if (!isTileType(tile.type)) {
              continue;
            }

            if (tile.y >= controller.rows || tile.x >= controller.cols) {
              continue;
            }

            controller.applyRevealTile(tile.y, tile.x, tile.type);
          }
          return;
        }

        case "gameOver": {
          controller.applyGameOver(message.payload.gameOver.state as GameState);
          return;
        }

        case "reset": {
          controller.applyReset();
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
    };
  }

  private destroyController(controller: GameController): void {
    controller.app.stop();
    controller.cleanup();
    controller.app.destroy(true, {
      children: true,
      texture: true
    });
  }
}
