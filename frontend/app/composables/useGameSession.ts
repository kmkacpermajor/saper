import { GameState } from "@saper/contracts";
import { GAME_EVENT_TYPE, type GameEvent } from "~/game/gameEvents";
import GameController from "~/game/gameController";
import log from "~/utils/logger";

export const useGameSession = () => {
  const wsClient = useWsClient();

  const currentGameState = useState<GameState>("game:state", () => GameState.DISCONNECTED);
  const currentNumBombs = useState<number>("game:num-bombs", () => 0);
  const currentPlayerId = useState<number>("game:player-id", () => 0);
  const gameController = useState<GameController | null>("game:controller", () => null);

  const gameRunning = computed(() => currentGameState.value >= GameState.IN_PROGRESS);

  const gameStatusMessage = computed(() => {
    if (currentGameState.value === GameState.CONNECTING) return "Connecting...";
    if (currentGameState.value === GameState.IN_PROGRESS) return `Mine count: ${currentNumBombs.value}`;
    if (currentGameState.value === GameState.WON) return "You won! 🎉";
    if (currentGameState.value === GameState.DISCONNECTED) return "Disconnected";
    return "You lost! 💥";
  });

  const resetSessionState = (): void => {
    currentGameState.value = GameState.DISCONNECTED;
    currentNumBombs.value = 0;
    currentPlayerId.value = 0;
  };

  const applyGameUpdateEvent = (event: GameEvent): void => {
    if (event.type === GAME_EVENT_TYPE.GAME_STATE_UPDATE) {
      currentGameState.value = event.payload;
      return;
    }

    if (event.type === GAME_EVENT_TYPE.NUM_BOMBS_UPDATE) {
      currentNumBombs.value = event.payload;
      return;
    }

    if (event.type === GAME_EVENT_TYPE.PLAYER_ID_UPDATE) {
      currentPlayerId.value = event.payload;
    }
  };

  const destroyGameController = (): void => {
    if (!gameController.value) {
      return;
    }

    gameController.value.cleanup();
    gameController.value = null;
  };

  const connectJoinGame = async (id: string, container: HTMLDivElement | null): Promise<void> => {
    if (currentGameState.value === GameState.CONNECTING) {
      return;
    }

    if (!container) {
      throw new Error("Game canvas container is not available.");
    }

    currentGameState.value = GameState.CONNECTING;

    try {
      const requestedGameId = parseGameId(id);

      destroyGameController();
      wsClient.disconnect();

      const controller = new GameController(applyGameUpdateEvent, wsClient);
      await controller.init(requestedGameId);
      gameController.value = controller;

      container.appendChild(controller.app.canvas);

      currentGameState.value = GameState.IN_PROGRESS;
    } catch (err: unknown) {
      disconnect();

      log.error("[client] Game connection error:", err);
      throw err;
    }
  };

  const disconnect = (): void => {
    destroyGameController();
    wsClient.disconnect();
    resetSessionState();
  };

  const zoomIn = (): void => {
    gameController.value?.zoomViewportAtCanvasCenter(1.12);
  };

  const zoomOut = (): void => {
    gameController.value?.zoomViewportAtCanvasCenter(0.88);
  };

  const centerViewport = (): void => {
    gameController.value?.centerViewport();
  };

  return {
    connectJoinGame,
    disconnect,
    zoomIn,
    zoomOut,
    centerViewport,
    gameRunning,
    currentGameState,
    currentNumBombs,
    currentPlayerId,
    gameStatusMessage
  };
};