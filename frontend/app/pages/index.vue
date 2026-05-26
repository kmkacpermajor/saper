<script setup lang="ts">
const activeView = ref<"play" | "leaderboard">("play");
</script>

<template>
  <section class="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 overflow-hidden">
    <Head>
      <Title>Minesweeper</Title>
    </Head>

    <div class="flex shrink-0 justify-center">
      <div class="inline-flex rounded-lg border border-slate-300 bg-white/90 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
        <button type="button" class="rounded-md px-5 py-2 text-sm font-semibold transition"
          :class="activeView === 'play' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="activeView = 'play'">
          Play
        </button>
        <button type="button" class="rounded-md px-5 py-2 text-sm font-semibold transition"
          :class="activeView === 'leaderboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="activeView = 'leaderboard'">
          Leaderboard
        </button>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 items-start justify-center overflow-auto py-2">
      <div v-show="activeView === 'play'"
        class="w-full max-w-xl rounded-lg border border-slate-300/80 bg-white/95 p-8 shadow-lg dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-100">
        <GameSetupForm />
      </div>

      <Leaderboard v-show="activeView === 'leaderboard'" />
    </div>
  </section>
</template>
