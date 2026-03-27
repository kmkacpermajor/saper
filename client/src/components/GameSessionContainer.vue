<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { GameState } from "@saper/contracts";
import GameControlPanel from "@/components/GameControlPanel.vue";
import GameSetupForm from "@/components/GameSetupForm.vue";
import { useGameStore } from "@/stores/gameStore";
import { useSessionStore } from "@/stores/sessionStore";

const sessionStore = useSessionStore();
const gameStore = useGameStore();

const {
  connecting,
  connectionType,
  currentGameId,
  error,
  gameCanvasContainer,
  gameId,
  gameRunning
} = storeToRefs(sessionStore);
const { boardHeight, boardWidth, currentGameState, currentNumBombs, gameStatusMessage, maxBombs, numBombs } =
  storeToRefs(gameStore);

const { connect, disconnect, resetGame } = sessionStore;

const statusText = computed(() => {
  if (currentGameState.value !== GameState.IN_PROGRESS) {
    return gameStatusMessage.value;
  }

  return `Mine count: ${currentNumBombs.value}`;
});

onBeforeUnmount(() => {
  disconnect();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 w-auto flex flex-col items-center">
    <h1 class="text-3xl font-bold text-gray-800">Minesweeper 💣</h1>

    <GameSetupForm
      v-if="!gameRunning"
      :board-height="boardHeight"
      :board-width="boardWidth"
      :connecting="connecting"
      :connection-type="connectionType"
      :error="error"
      :game-id="gameId"
      :max-bombs="maxBombs"
      :num-bombs="numBombs"
      @connect="connect"
      @update:board-height="boardHeight = $event"
      @update:board-width="boardWidth = $event"
      @update:connection-type="connectionType = $event"
      @update:game-id="gameId = $event"
      @update:num-bombs="numBombs = $event"
    />

    <div
      v-show="gameRunning"
      class="my-4 w-min justify-center border border-gray-400 bg-gray-100 rounded-lg shadow-md p-4">
      <div ref="gameCanvasContainer" id="gameCanvasContainer" class="border-1 border-gray-400"></div>
    </div>

    <GameControlPanel
      v-if="gameRunning"
      :game-id="currentGameId"
      :game-running="gameRunning"
      :status-text="statusText"
      @disconnect="disconnect"
      @reset="resetGame"
    />
  </div>
</template>
