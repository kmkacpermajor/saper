import { computed, nextTick, ref } from "vue";
import { defineStore } from "pinia";
import { GameState } from "@saper/contracts";
import { GAME_EVENT_TYPE, type GameEvent as GameUpdateEvent } from "@/game/gameEvents";
import GameSession from "@/game/gameSession";
import log from "@/services/logger";
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
  let gameSession: GameSession | null = null;

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

  const destroyGameSession = (): void => {
    if (!gameSession) {
      return;
    }

    gameSession.stop();
    gameSession = null;
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

      if (numBombs.value > maxBombs.value) {
        throw new Error("Too much");
      }

      destroyGameSession();

      const session = new GameSession(wsClient, applyGameUpdateEvent);
      const canvas = await session.start({
        boardHeight: boardHeight.value,
        boardWidth: boardWidth.value,
        gameId: gameId.value,
        numBombs: numBombs.value,
        connectionType: connectionType.value
      });
      gameSession = session;

      gameRunning.value = true;
      await nextTick();

      if (gameCanvasContainer.value) {
        gameCanvasContainer.value.innerHTML = "";
        canvas.style.display = "block";
        canvas.style.borderRadius = "0.375rem";
        gameCanvasContainer.value.appendChild(canvas);
      }

      gameSession.fitViewport();
    } catch (err: unknown) {
      destroyGameSession();

      const message = err instanceof Error ? err.message : "Unknown error";
      error.value = `Connection failed: ${message}`;
      log.error("[client] Game connection error:", err);
    } finally {
      connecting.value = false;
    }
  };

  const disconnect = (): void => {
    destroyGameSession();
    resetSessionState();
  };

  const resetGame = (): void => {
    gameSession?.reset();
  };

  const zoomIn = (): void => {
    gameSession?.zoomIn();
  };

  const zoomOut = (): void => {
    gameSession?.zoomOut();
  };

  const fitViewport = (): void => {
    gameSession?.fitViewport();
  };

  const centerViewport = (): void => {
    gameSession?.centerViewport();
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
