<script setup lang="ts">
import { BoardSize, Difficulty } from '@saper/contracts';
  
const { boardSize, difficulty, customBoardWidth, customBoardHeight, customNumBombs } = useGameSetupState();

const maxBombs = computed(() => Math.floor(customBoardWidth.value * customBoardHeight.value * 0.35));

const { connectionType, gameId, connecting, connectFromSetup } = useGameConnection();
const { gameError } = useGameError();

const onConnect = async (): Promise<void> => {
  await connectFromSetup({
    customRows: customBoardHeight.value,
    customCols: customBoardWidth.value,
    customNumBombs: customNumBombs.value,
    difficulty: difficulty.value,
    boardSize: boardSize.value
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
    <div class="flex flex-row justify-center">

      <label class="cursor-pointer">
        <input type="radio" v-model="connectionType" value="create" class="peer sr-only" />
        <div
          class="py-2 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent transition-colors border-b border-gray-200 dark:border-slate-700 hover:text-gray-700 peer-checked:border-blue-600 peer-checked:text-blue-600 dark:text-slate-400 dark:hover:text-slate-200 dark:peer-checked:border-blue-500 dark:peer-checked:text-blue-500">
          Create Game
        </div>
      </label>

      <label class="cursor-pointer">
        <input type="radio" v-model="connectionType" value="join" class="peer sr-only" />
        <div
          class="py-2 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent transition-colors border-b border-gray-200 dark:border-slate-700 hover:text-gray-700 peer-checked:border-blue-600 peer-checked:text-blue-600 dark:text-slate-400 dark:hover:text-slate-200 dark:peer-checked:border-blue-500 dark:peer-checked:text-blue-500">
          Join Game
        </div>
      </label>

    </div>

    <div v-if="connectionType === 'create'" class="space-x-8 flex justify-between">
      <div class="space-y-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Board Size</label>
          <select v-model="boardSize"
            class="w-40 rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option :value="BoardSize.SMALL">Small</option>
            <option :value="BoardSize.MEDIUM">Medium</option>
            <option :value="BoardSize.BIG">Big</option>
            <option :value="BoardSize.HUGE">Huge</option>
            <option :value="BoardSize.CUSTOM">Custom</option>
          </select>
        </div>
        <div v-show="boardSize === BoardSize.CUSTOM">
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Size</label>
          <div class="flex items-center space-x-2">
            <input v-model.number="customBoardWidth" type="tel" min="5" max="30"
              class="w-16 rounded-md border px-3 py-2 text-center focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
            <span class="text-gray-500 dark:text-slate-400">×</span>
            <input v-model.number="customBoardHeight" type="tel" min="5" max="30"
              class="w-16 rounded-md border px-3 py-2 text-center focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Difficulty</label>
          <select v-model="difficulty"
            class="w-40 rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option :value="Difficulty.EASY">Easy</option>
            <option :value="Difficulty.INTERMEDIATE">Intermediate</option>
            <option :value="Difficulty.HARD">Hard</option>
            <option :value="Difficulty.EXPERT">Expert</option>
            <option :value="Difficulty.CUSTOM">Custom</option>
          </select>
        </div>
        <div v-show="difficulty === Difficulty.CUSTOM">
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Bombs</label>
          <input v-model.number="customNumBombs" type="tel" :min="1" :max="maxBombs"
            class="w-40 rounded-md border px-3 py-2 text-center focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </div>
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
