<script setup lang="ts">
const gameCanvasContainer = ref<HTMLDivElement | null>(null);
const { username } = useGameSetupState();
const { routeGameId, gameStarted, connectFromRoute, disconnectRouteGame } = useGameConnection();
const isQrCodeOpen = ref(false);
const joining = ref(false);
const joinError = ref<string | null>(null);
const joined = ref(false);
const autoJoinGameId = useState<string | null>("game:auto-join-id", () => null);

const onJoin = async (): Promise<void> => {
  if (joining.value) {
    return;
  }

  joining.value = true;
  joinError.value = null;

  try {
    await connectFromRoute(gameCanvasContainer.value, username.value);
    joined.value = true;
    autoJoinGameId.value = null;
  } catch (error: unknown) {
    joinError.value = getErrorMessage(error, "Could not join game.");
  } finally {
    joining.value = false;
  }
};

onMounted(() => {
  if (autoJoinGameId.value === routeGameId.value) {
    void onJoin();
  }
});

onBeforeUnmount(() => {
  disconnectRouteGame();
});
</script>

<template>
  <section
    class="relative flex h-full min-h-0 w-full flex-col rounded-2xl border border-slate-500/40 p-0 shadow-2xl dark:border-slate-600/60">
    <Head>
      <Title>Game: {{ routeGameId }}</Title>
    </Head>

    <GameControlPanel v-if="joined" :game-id="routeGameId" class="shrink-0" @open-qr-code="isQrCodeOpen = true" />

    <div ref="gameCanvasContainer" id="gameCanvasContainer" class="h-full w-full touch-none select-none">
      <div v-if="!joined"
        class="absolute inset-0 flex items-center justify-center bg-slate-100/80 p-4 backdrop-blur-[1px] dark:bg-slate-900/80">
        <form class="w-full max-w-sm rounded-lg border border-slate-300 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          @submit.prevent="onJoin">
          <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">Join game {{ routeGameId }}</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the name that will appear on the leaderboard if this game is ranked.</p>

          <p v-if="joinError" class="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {{ joinError }}
          </p>

          <label class="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Username
            <input v-model="username" maxlength="40" placeholder="Username"
              class="mt-1 w-full rounded-md border px-4 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400" />
          </label>

          <button type="submit" :disabled="joining"
            class="mt-5 w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400">
            {{ joining ? "Joining..." : "Join Game" }}
          </button>
        </form>
      </div>

      <Transition name="canvas-loading">
        <div v-if="joined && !gameStarted"
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
              class="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Scan to join</h2>
                  <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Share this link with friends.</p>
                </div>
                <button type="button" aria-label="Close QR code" @click="isQrCodeOpen = false"
                  class="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  x
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
