<script setup lang="ts">
const boardWidth = ref(15);
const boardHeight = ref(15);
const numBombs = ref(15);
const maxBombs = computed(() => Math.floor(boardWidth.value * boardHeight.value * 0.35));

const { connectionType, gameId, connecting, connectFromSetup } = useRouteGameConnection();
const { gameError } = useGameError();

const onConnect = async (): Promise<void> => {
  await connectFromSetup({
    rows: boardHeight.value,
    cols: boardWidth.value,
    numBombs: numBombs.value
  });
};
</script>

<template>
  <h1 class="mb-4 text-center text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Minesweeper 💣
  </h1>
  <p v-if="gameError"
    class="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
    {{ gameError }}
  </p>
  <div class="space-y-4">
    <div class="flex flex-col space-y-2">
      <label class="inline-flex items-center">
        <input type="radio" v-model="connectionType" value="create" class="h-4 w-4 text-blue-600" />
        <span class="ml-2 dark:text-slate-200">Create Game</span>
      </label>
      <label class="inline-flex items-center">
        <input type="radio" v-model="connectionType" value="join" class="h-4 w-4 text-blue-600" />
        <span class="ml-2 dark:text-slate-200">Join Game</span>
      </label>
    </div>

    <div v-if="connectionType === 'create'" class="space-x-8 flex justify-between">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Size</label>
        <div class="flex items-center space-x-2">
          <input v-model.number="boardWidth" type="tel" min="5" max="30"
            class="w-16 rounded-md border px-3 py-2 text-center focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <span class="text-gray-500 dark:text-slate-400">×</span>
          <input v-model.number="boardHeight" type="tel" min="5" max="30"
            class="w-16 rounded-md border px-3 py-2 text-center focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </div>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Bombs</label>
        <input v-model.number="numBombs" type="tel" :min="1" :max="maxBombs"
          class="w-16 rounded-md border px-3 py-2 text-center focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
      </div>
    </div>

    <input v-if="connectionType === 'join'" v-model="gameId" placeholder="Enter Game ID" @keyup.enter="onConnect"
      class="w-full rounded-md border px-4 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400" />

    <button @click="onConnect" :disabled="connecting"
      class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400">
      {{ connecting ? "Connecting..." : connectionType === "create" ? "Create Game" : "Join Game" }}
    </button>
  </div>
</template>
