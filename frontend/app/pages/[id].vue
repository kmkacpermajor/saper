<script setup lang="ts">

const gameCanvasContainer = ref<HTMLDivElement | null>(null);
const { routeGameId, gameRunning, connectFromRoute, disconnectRouteGame } = useRouteGameConnection();

onMounted(async () => {
    await connectFromRoute(gameCanvasContainer.value);
});

onBeforeUnmount(() => {
    disconnectRouteGame();
});
</script>

<template>
    <section
        class="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col rounded-2xl border border-slate-300/80 bg-white/95 p-4 shadow-2xl md:p-8 dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-100">
        <!-- <h1 class="mb-4 text-center text-4xl font-extrabold tracking-tight text-slate-800">Minesweeper 💣</h1> -->
        <GameControlPanel :game-id="routeGameId" class="shrink-0" />

        <div
            class="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-400/70 bg-slate-200/70 p-1 dark:border-slate-700/70 dark:bg-slate-800/60">
            <div ref="gameCanvasContainer" id="gameCanvasContainer"
                class="relative h-full w-full rounded-md border border-slate-500/40 bg-slate-100/70 touch-none select-none dark:border-slate-600/60 dark:bg-slate-900/55">
                <Transition name="canvas-loading">
                    <div v-if="!gameRunning"
                        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100/65 backdrop-blur-[1px] dark:bg-slate-900/65">
                        <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-400 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-100"
                            role="status" aria-label="Connecting to game"></div>
                        <p class="text-sm text-slate-600 dark:text-slate-300">Connecting...</p>
                    </div>
                </Transition>
            </div>
        </div>
    </section>
</template>

<style scoped>
.canvas-loading-enter-active,
.canvas-loading-leave-active {
    transition: opacity 220ms ease, transform 220ms ease;
}

.canvas-loading-enter-from,
.canvas-loading-leave-to {
    opacity: 0;
    transform: scale(0.985);
}

@media (prefers-reduced-motion: reduce) {

    .canvas-loading-enter-active,
    .canvas-loading-leave-active {
        transition: none;
    }
}
</style>
