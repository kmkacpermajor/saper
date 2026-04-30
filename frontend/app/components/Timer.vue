<script setup lang="ts">
const gameSession = useGameSession();

const { timerElement, start, stop, freezeAt } = useStopwatch();

watch(
  () => [
    gameSession.currentGameTimeMs.value, 
    gameSession.gameRunning.value, 
    gameSession.firstMoveMade.value
  ],
  ([newTime, isRunning, firstMoveMade]) => {
      const timeMs = newTime as number;

      if (timeMs > 0) {
        if (isRunning) {
          start(timeMs);
        } else {
          freezeAt(timeMs);
        }
        return;
      }

      if (firstMoveMade && isRunning) {
        start(0);
        return;
      }
  },
  { immediate: true }
);

onUnmounted(() => {
  stop();
});
</script>

<template>
  <span ref="timerElement"
    class="rounded-md bg-white px-3 py-1 font-mono text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
    00:00.000
  </span>
</template>