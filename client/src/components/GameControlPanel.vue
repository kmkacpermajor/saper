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

const onZoomIn = (): void => {
  gameStore.zoomIn();
};

const onZoomOut = (): void => {
  gameStore.zoomOut();
};

const onCenterViewport = (): void => {
  gameStore.centerViewport();
};
</script>

<template>
  <div class="rounded-xl border border-slate-300 bg-slate-50/80 p-3 shadow-sm">
    <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-md bg-white px-3 py-1 font-mono text-sm text-slate-700 shadow-sm">
          ID: {{ currentGameId }}
        </span>
        <span
          class="rounded-md px-3 py-1 text-sm font-semibold"
          :class="gameRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
        >
          {{ gameStatusMessage }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="onZoomOut"
          class="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300"
        >
          Zoom -
        </button>
        <button
          @click="onCenterViewport"
          class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Center
        </button>
        <button
          @click="onZoomIn"
          class="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300"
        >
          Zoom +
        </button>
        <button
          @click="onReset"
          class="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
        >
          Reset
        </button>
        <button
          @click="onDisconnect"
          class="rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
        >
          Disconnect
        </button>
      </div>
    </div>

    <div v-if="gameRunning" class="mt-2 text-xs text-slate-500">
      Drag: pan, Wheel/Pinch: zoom
    </div>
  </div>
</template>
