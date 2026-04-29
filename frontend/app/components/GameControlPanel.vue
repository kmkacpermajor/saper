<script setup lang="ts">

defineProps<{
  gameId: string;
}>();

const emit = defineEmits<{
  (event: 'open-qr-code'): void;
}>();

const router = useRouter();
const gameSession = useGameSession();

</script>

<template>
  <div
    class="absolute left-1/2 top-4 -translate-x-1/2 rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
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
        <button type="button"
          class="rounded-md bg-white px-3 py-1 font-mono text-sm text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Show QR code"
          @click="emit('open-qr-code')">
          <QrCodeIcon size="20" class="text-blue-500" />
        </button>
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
        <button @click="gameSession.disconnect(); navigateTo('/');"
          class="rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500">
          Disconnect
        </button>
      </div>
    </div>

    <!-- <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">
      Drag: pan, Wheel/Pinch: zoom
    </div> -->
  </div>
</template>
