<script setup lang="ts">
const { entries } = useLeaderboardEntries();
</script>

<template>
    <h2 class="mb-4 text-center text-xl font-bold tracking-tight text-slate-800">Leaderboard</h2>
    <table>
        <thead>
            <tr class="text-left text-sm font-semibold text-slate-600">
                <th class="px-4 py-2">Players</th>
                <th class="px-4 py-2">Time</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="entry in entries" :key="entry.id" class="border-t border-slate-300">
                <td class="px-4 py-2">{{ entry.playerNames.join(", ") }}</td>
                <td class="px-4 py-2">{{ entry.formattedTime }}</td>
            </tr>
        </tbody>
    </table>
</template>