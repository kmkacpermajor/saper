<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useGameStore } from "@/stores/gameStore";

const gameStore = useGameStore();
const { currentGameId, gameRunning, gameStatusMessage } = storeToRefs(gameStore);

const onDisconnect = (): void => {
  gameStore.disconnect();
};

const onReset = (): void => {
  gameStore.resetGame();
};
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="text-sm text-gray-600">Game ID:</p>
      <code class="block bg-gray-100 px-3 py-2 rounded font-mono text-sm">{{ currentGameId }}</code>
    </div>

    <p class="text-sm" :class="gameRunning ? 'text-green-600' : 'text-red-600'">
      {{ gameStatusMessage }}
    </p>

    <button
      v-if="gameRunning"
      @click="onReset"
      class="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md"
    >
      Reset Game
    </button>

    <button
      @click="onDisconnect"
      class="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md"
    >
      Disconnect
    </button>
  </div>
</template>
