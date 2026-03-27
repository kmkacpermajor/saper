import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { GameState } from "@saper/contracts";

export type GameEvent =
  | { type: "GAME_ID_UPDATE"; payload: string }
  | { type: "GAME_STATE_UPDATE"; payload: GameState }
  | { type: "NUM_BOMBS_UPDATE"; payload: number };

export const useGameStore = defineStore("game", () => {
  const boardWidth = ref(15);
  const boardHeight = ref(15);
  const numBombs = ref(15);

  const currentGameState = ref(GameState.IN_PROGRESS);
  const currentNumBombs = ref(0);

  const maxBombs = computed(() => Math.floor(boardWidth.value * boardHeight.value * 0.35));

  const gameStatusMessage = computed(() => {
    if (currentGameState.value === GameState.IN_PROGRESS) return "In progress";
    if (currentGameState.value === GameState.WON) return "You won! 🎉";
    return "You lost! 💥";
  });

  const resetRuntimeState = (): void => {
    currentGameState.value = GameState.IN_PROGRESS;
    currentNumBombs.value = 0;
  };

  const applyServerGameEvent = (event: GameEvent): void => {
    if (event.type === "GAME_STATE_UPDATE") {
      currentGameState.value = event.payload;
      return;
    }

    if (event.type === "NUM_BOMBS_UPDATE") {
      currentNumBombs.value = event.payload;
    }
  };

  return {
    applyServerGameEvent,
    boardHeight,
    boardWidth,
    currentGameState,
    currentNumBombs,
    gameStatusMessage,
    maxBombs,
    numBombs,
    resetRuntimeState
  };
});
