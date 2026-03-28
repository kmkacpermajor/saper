<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import GameControlPanel from "@/components/GameControlPanel.vue";
import GameSetupForm from "@/components/GameSetupForm.vue";
import { useGameStore } from "@/stores/gameStore";

const gameStore = useGameStore();
const { gameCanvasContainer, gameRunning } = storeToRefs(gameStore);

onBeforeUnmount(() => {
  gameStore.disconnect();
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-md p-6 w-auto flex flex-col items-center">
      <h1 class="text-3xl font-bold text-gray-800">Minesweeper 💣</h1>

      <GameSetupForm v-if="!gameRunning" />

      <div
        v-show="gameRunning"
        class="my-4 w-min justify-center border border-gray-400 bg-gray-100 rounded-lg shadow-md p-4">
        <div ref="gameCanvasContainer" id="gameCanvasContainer" class="border-1 border-gray-400"></div>
      </div>

      <GameControlPanel v-if="gameRunning" />
    </div>
  </div>
</template>