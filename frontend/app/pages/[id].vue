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
    <section class="min-h-0 flex flex-1 flex-col gap-3">
        <GameControlPanel :game-id="routeGameId" class="shrink-0" />

        <div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-400/70 bg-slate-200/70 p-1">
            <div ref="gameCanvasContainer" id="gameCanvasContainer"
                class="relative h-full w-full rounded-md border border-slate-500/40 bg-slate-100/70 touch-none select-none">
                <Transition name="canvas-loading">
                    <div v-if="!gameRunning"
                        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100/65 backdrop-blur-[1px]">
                        <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-400 border-t-slate-700"
                            role="status" aria-label="Connecting to game"></div>
                        <p class="text-sm text-slate-600">Connecting...</p>
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
