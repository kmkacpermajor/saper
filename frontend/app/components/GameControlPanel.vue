<script setup lang="ts">

defineProps<{
  gameId: string;
}>();

const router = useRouter();
const gameSession = useGameSession();

</script>

<template>
  <div
    class="rounded-xl border border-slate-300 bg-slate-50/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
    <div class="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-md bg-white px-3 py-1 font-mono text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
          ID: {{ gameId }}
        </span>
        <span class="rounded-md px-3 py-1 text-sm font-semibold" :class="gameSession.gameRunning
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'">
          {{ gameSession.gameStatusMessage }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-md bg-white px-3 py-1 font-mono text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200" v-if="gameSession.currentGameTimeMs.value !== 0">
          Time: {{ formatTime(gameSession.currentGameTimeMs.value) }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button @click="gameSession.zoomOut();"
          class="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">
          Zoom -
        </button>
        <button @click="gameSession.centerViewport();"
          class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400">
          Center
        </button>
        <button @click="gameSession.zoomIn();"
          class="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">
          Zoom +
        </button>
        <button @click="gameSession.disconnect(); router.push('/');"
          class="rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500">
          Disconnect
        </button>
      </div>
    </div>

    <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">
      Drag: pan, Wheel/Pinch: zoom
    </div>
  </div>
</template>
