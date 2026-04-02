import { computed, nextTick, ref } from "vue";
import { defineStore } from "pinia";
import { GameState, NEW_GAME_ID } from "@saper/contracts";
import { GAME_EVENT_TYPE, type GameEvent as GameUpdateEvent } from "@/game/gameEvents";
import GameController from "@/game/gameController";
import log from "@/services/logger";
import { getSharedPixiApplication } from "@/services/pixiWarmup";
import { wsClient } from "@/services/wsClient";

export const useGameStore = defineStore("game", () => {
  const boardWidth = ref(15);
  const boardHeight = ref(15);
  const numBombs = ref(15);

  const gameCanvasContainer = ref<HTMLDivElement | null>(null);
  const gameRunning = ref(false);
  const connecting = ref(false);
  const error = ref<string | null>(null);
  const connectionType = ref<"create" | "join">("create");
  const gameId = ref("");
  const currentGameId = ref("");

  const currentGameState = ref(GameState.IN_PROGRESS);
  const currentNumBombs = ref(0);
  let gameController: GameController | null = null;

  const maxBombs = computed(() => Math.floor(boardWidth.value * boardHeight.value * 0.35));

  const gameStatusMessage = computed(() => {
    if (currentGameState.value === GameState.IN_PROGRESS) return `Mine count: ${currentNumBombs.value}`;
    if (currentGameState.value === GameState.WON) return "You won! 🎉";
    return "You lost! 💥";
  });

  const resetRuntimeState = (): void => {
    currentGameState.value = GameState.IN_PROGRESS;
    currentNumBombs.value = 0;
  };

  const resetSessionState = (): void => {
    currentGameId.value = "";
    gameRunning.value = false;
    connectionType.value = "create";
    gameId.value = "";
    resetRuntimeState();
  };

  const applyGameUpdateEvent = (event: GameUpdateEvent): void => {
    if (event.type === GAME_EVENT_TYPE.GAME_ID_UPDATE) {
      currentGameId.value = event.payload;
      return;
    }

    if (event.type === GAME_EVENT_TYPE.GAME_STATE_UPDATE) {
      currentGameState.value = event.payload;
      return;
    }

    if (event.type === GAME_EVENT_TYPE.NUM_BOMBS_UPDATE) {
      currentNumBombs.value = event.payload;
    }
  };

  const destroyGameController = (): void => {
    if (!gameController) {
      return;
    }

    gameController.cleanup();
    gameController = null;
    wsClient.disconnect();
  };

  const connect = async (): Promise<void> => {
    if (connecting.value) {
      return;
    }

    error.value = null;
    connecting.value = true;

    try {
      if (connectionType.value === "join" && !gameId.value) {
        throw new Error("Please enter a Game ID");
      }

      destroyGameController();

      const resolvedGameId =
        connectionType.value === "join" ? Number(gameId.value) : NEW_GAME_ID;
      const app = await getSharedPixiApplication();
      app.start();

      let readyResolved = false;
      let resolveReady!: () => void;
      let rejectReady!: (reason?: unknown) => void;
      const readyPromise = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });

      const settleReady = (settler: (() => void) | ((reason?: unknown) => void), reason?: unknown): void => {
        if (readyResolved) {
          return;
        }

        readyResolved = true;
        if (reason === undefined) {
          (settler as () => void)();
          return;
        }

        (settler as (reason?: unknown) => void)(reason);
      };

      const readyTimeoutId = window.setTimeout(() => {
        settleReady(rejectReady, new Error("Server did not confirm game setup in time."));
      }, 8000);

      const controller = new GameController(resolvedGameId, applyGameUpdateEvent, wsClient, app, {
        onConnected: () => {
          window.clearTimeout(readyTimeoutId);
          settleReady(resolveReady);
        },
        onProtocolError: (code: string, message: string) => {
          window.clearTimeout(readyTimeoutId);
          settleReady(rejectReady, new Error(`${message}`));
        }
      });
      await controller.init();
      gameController = controller;

      if (connectionType.value === "join") {
        await wsClient.joinGame(
          {
            requestedGameId: Number(gameId.value)
          },
          controller.handleReceivedServerMessage
        );
      } else {
        await wsClient.createGame(
          {
            rows: boardHeight.value,
            cols: boardWidth.value,
            numBombs: numBombs.value
          },
          controller.handleReceivedServerMessage
        );
      }

      await readyPromise;

      const canvas = controller.app.canvas;

      gameRunning.value = true;
      await nextTick();

      if (gameCanvasContainer.value) {
        gameCanvasContainer.value.innerHTML = "";
        canvas.style.display = "block";
        canvas.style.borderRadius = "0.375rem";
        gameCanvasContainer.value.appendChild(canvas);
      }

      gameController.fitViewport();
    } catch (err: unknown) {
      destroyGameController();

      const message = err instanceof Error ? err.message : "Unknown error";
      error.value = `Connection failed: ${message}`;
      log.error("[client] Game connection error:", err);
    } finally {
      connecting.value = false;
    }
  };

  const disconnect = (): void => {
    destroyGameController();
    resetSessionState();
  };

  const resetGame = (): void => {
    if (!gameController) {
      return;
    }

    wsClient.sendReset();
  };

  const zoomIn = (): void => {
    gameController?.zoomViewportAtCanvasCenter(1.12);
  };

  const zoomOut = (): void => {
    gameController?.zoomViewportAtCanvasCenter(0.88);
  };

  const fitViewport = (): void => {
    gameController?.fitViewport();
  };

  const centerViewport = (): void => {
    gameController?.centerViewport();
  };

  return {
    connect,
    disconnect,
    resetGame,
    zoomIn,
    zoomOut,
    fitViewport,
    centerViewport,
    gameCanvasContainer,
    gameRunning,
    connecting,
    error,
    connectionType,
    gameId,
    currentGameId,
    boardHeight,
    boardWidth,
    currentGameState,
    currentNumBombs,
    gameStatusMessage,
    maxBombs,
    numBombs
  };
});
