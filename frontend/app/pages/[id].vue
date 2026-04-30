<script setup lang="ts">

const gameCanvasContainer = ref<HTMLDivElement | null>(null);
const { routeGameId, gameStarted, connectFromRoute, disconnectRouteGame } = useGameConnection();
const isQrCodeOpen = ref(false);

onMounted(async () => {
    await connectFromRoute(gameCanvasContainer.value);
});

onBeforeUnmount(() => {
    disconnectRouteGame();
});
</script>

<template>
    <section
        class="relative p-0 flex w-full h-full min-h-0 flex-col rounded-2xl shadow-2xl border border-slate-500/40 dark:border-slate-600/60">
        <!-- <h1 class="mb-4 text-center text-4xl font-extrabold tracking-tight text-slate-800">Minesweeper 💣</h1> -->
        <Head>
            <Title>Game: {{ routeGameId }}</Title>
        </Head>
        <GameControlPanel :game-id="routeGameId" class="shrink-0" @open-qr-code="isQrCodeOpen = true" />

        <div ref="gameCanvasContainer" id="gameCanvasContainer" class="h-full w-full touch-none select-none ">
            <Transition name="canvas-loading">
                <div v-if="!gameStarted"
                    class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100/65 backdrop-blur-[1px] dark:bg-slate-900/65">
                    <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-400 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-100"
                        role="status" aria-label="Connecting to game"></div>
                    <p class="text-sm text-slate-600 dark:text-slate-300">Connecting...</p>
                </div>
            </Transition>
        </div>

        <ClientOnly>
            <Teleport to="body">
                <Transition name="qr-modal">
                    <div v-show="isQrCodeOpen"
                        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
                        role="dialog" aria-modal="true" aria-label="Game QR code" @click.self="isQrCodeOpen = false">
                        <div
                            class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0">
                                    <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Scan to join
                                    </h2>
                                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Share this link with
                                        friends.</p>
                                </div>
                                <button type="button" aria-label="Close QR code" @click="isQrCodeOpen = false"
                                    class="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                                    ✕
                                </button>
                            </div>
                            <div class="mt-5 flex justify-center">
                                <LazyQrCodeModal />
                            </div>
                        </div>
                    </div>
                </Transition>
            </Teleport>
        </ClientOnly>
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

.qr-modal-enter-active,
.qr-modal-leave-active {
    transition: opacity 200ms ease, transform 200ms ease;
}

.qr-modal-enter-from,
.qr-modal-leave-to {
    opacity: 0;
    transform: scale(0.98);
}
</style>
