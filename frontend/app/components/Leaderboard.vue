<script setup lang="ts">
import { BoardSize, Difficulty } from "@saper/contracts";

const { boardSize, difficulty } = useGameSetupState();
const { entries, loading, error, levelCode } = useLeaderboardEntries();

const boardSizeOptions = [
  { value: BoardSize.SMALL, label: "Small" },
  { value: BoardSize.MEDIUM, label: "Medium" },
  { value: BoardSize.BIG, label: "Big" },
  { value: BoardSize.HUGE, label: "Huge" }
];

const difficultyOptions = [
  { value: Difficulty.EASY, label: "Easy" },
  { value: Difficulty.INTERMEDIATE, label: "Intermediate" },
  { value: Difficulty.HARD, label: "Hard" },
  { value: Difficulty.EXPERT, label: "Expert" }
];
</script>

<template>
  <div class="w-full max-w-5xl overflow-hidden rounded-lg border border-slate-300/80 bg-white/95 shadow-lg dark:border-slate-700/80 dark:bg-slate-900/90">
    <div class="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Leaderboard</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Ranked games only. Custom board sizes and custom difficulties are ignored.</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <label class="text-sm font-medium text-slate-600 dark:text-slate-300">
          Board
          <select v-model="boardSize"
            class="mt-1 block w-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option v-for="option in boardSizeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <label class="text-sm font-medium text-slate-600 dark:text-slate-300">
          Difficulty
          <select v-model="difficulty"
            class="mt-1 block w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option v-for="option in difficultyOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="flex items-center justify-between bg-slate-50 px-5 py-3 text-sm text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
      <span>Level {{ levelCode ?? "-" }}</span>
      <span>Best time wins</span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px] border-collapse text-left">
        <thead class="bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
          <tr>
            <th class="w-20 px-5 py-3">Rank</th>
            <th class="w-36 px-5 py-3">Time</th>
            <th class="px-5 py-3">Username</th>
            <th class="w-56 px-5 py-3">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          <tr v-if="loading">
            <td colspan="4" class="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="4" class="px-5 py-8 text-center text-sm text-red-600 dark:text-red-300">{{ error }}</td>
          </tr>
          <tr v-else-if="entries.length === 0">
            <td colspan="4" class="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No ranked games yet.</td>
          </tr>
          <template v-else>
            <tr v-for="entry in entries" :key="entry.id" class="text-sm text-slate-700 dark:text-slate-200">
              <td class="px-5 py-3 font-semibold">{{ entry.rank }}</td>
              <td class="px-5 py-3 font-mono text-blue-600 dark:text-blue-300">{{ entry.formattedTime }}</td>
              <td class="px-5 py-3">{{ entry.playerNames.join(", ") }}</td>
              <td class="px-5 py-3 text-slate-500 dark:text-slate-400">{{ entry.formattedDate }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>