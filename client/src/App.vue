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
  <div class="h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f8fafc_0%,#e2e8f0_45%,#cbd5e1_100%)] p-4">
    <div class="mx-auto flex h-full max-w-[1500px] flex-col rounded-2xl border border-slate-300/80 bg-white/95 p-4 shadow-2xl">
      <h1 class="mb-4 text-center text-4xl font-extrabold tracking-tight text-slate-800">Minesweeper 💣</h1>

      <GameSetupForm v-show="!gameRunning" />

      <section v-show="gameRunning" class="min-h-0 flex flex-1 flex-col gap-3">
        <GameControlPanel class="shrink-0" />
        <div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-400/70 bg-slate-200/70 p-1">
          <div
            ref="gameCanvasContainer"
            id="gameCanvasContainer"
            class="h-full w-full rounded-md border border-slate-500/40 bg-slate-100/70 touch-none select-none"
          ></div>
        </div>
      </section>
    </div>
  </div>
</template>