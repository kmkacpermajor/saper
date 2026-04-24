<script setup lang="ts">


</script>

<template>
    <section class="mx-auto w-fit flex h-fit flex space-x-4">
        <div
            class="rounded-2xl border border-slate-300/80 bg-white/95 p-8 shadow-lg dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-100">
            <GameSetupForm />
        </div>
        <div
            class="rounded-2xl border border-slate-300/80 bg-white/95 p-8 shadow-lg dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-100">
            <Leaderboard />
        </div>
    </section>
</template>
