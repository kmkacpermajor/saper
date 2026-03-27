import { ref } from "vue";
import { defineStore } from "pinia";
import { wsClient } from "@/services/wsClient";
import { useGameStore, type GameEvent } from "@/stores/gameStore";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type LastConnectionConfig = {
  boardHeight: number;
  boardWidth: number;
  gameId: string;
  numBombs: number;
  connectionType: "create" | "join";
};

export const useSessionStore = defineStore("session", () => {
  const gameStore = useGameStore();

  const gameCanvasContainer = ref<HTMLDivElement | null>(null);
  const gameRunning = ref(false);
  const connecting = ref(false);
  const error = ref<string | null>(null);
  const connectionType = ref<"create" | "join">("create");
  const gameId = ref("");
  const currentGameId = ref("");
  const status = ref<ConnectionStatus>("disconnected");

  const reconnectCount = ref(0);
  const lastConnectionConfig = ref<LastConnectionConfig | null>(null);

  const resetSessionState = (): void => {
    currentGameId.value = "";
    gameRunning.value = false;
    status.value = "disconnected";
    gameStore.resetRuntimeState();
  };

  const applyServerGameEvent = (event: GameEvent): void => {
    if (event.type === "GAME_ID_UPDATE") {
      currentGameId.value = event.payload;
      return;
    }

    gameStore.applyServerGameEvent(event);
  };

  const connect = async (): Promise<void> => {
    if (connecting.value) return;

    error.value = null;
    connecting.value = true;
    status.value = "connecting";

    try {
      if (connectionType.value === "join" && !gameId.value) {
        throw new Error("Please enter a Game ID");
      }

      if (gameStore.numBombs > gameStore.maxBombs) {
        throw new Error("Too much");
      }

      const connectConfig: LastConnectionConfig = {
        boardHeight: gameStore.boardHeight,
        boardWidth: gameStore.boardWidth,
        gameId: gameId.value,
        numBombs: gameStore.numBombs,
        connectionType: connectionType.value
      };

      const canvas = await wsClient.connect({
        ...connectConfig,
        onGameEvent: applyServerGameEvent
      });

      if (gameCanvasContainer.value) {
        gameCanvasContainer.value.innerHTML = "";
        gameCanvasContainer.value.appendChild(canvas);
      }

      lastConnectionConfig.value = connectConfig;
      gameRunning.value = true;
      status.value = "connected";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      error.value = `Connection failed: ${message}`;
      status.value = "error";
      console.error("Game connection error:", err);
    } finally {
      connecting.value = false;
    }
  };

  const disconnect = (): void => {
    wsClient.disconnect();
    resetSessionState();
  };

  const reconnect = async (): Promise<void> => {
    const previous = lastConnectionConfig.value;
    if (!previous) {
      return;
    }

    reconnectCount.value += 1;

    connectionType.value = previous.connectionType;
    gameId.value = previous.gameId;
    gameStore.boardHeight = previous.boardHeight;
    gameStore.boardWidth = previous.boardWidth;
    gameStore.numBombs = previous.numBombs;

    await connect();
  };

  const resetGame = (): void => {
    wsClient.sendReset();
  };

  return {
    connect,
    connecting,
    connectionType,
    currentGameId,
    disconnect,
    error,
    gameCanvasContainer,
    gameId,
    gameRunning,
    reconnect,
    reconnectCount,
    resetGame,
    status
  };
});
