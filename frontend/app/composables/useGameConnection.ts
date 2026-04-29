import type { CreateGameRequest } from "@saper/contracts";

type SetupConnectionType = "create" | "join";

export const useGameConnection = () => {
  const route = useRoute();
  const router = useRouter();
  const loadingIndicator = useLoadingIndicator();
  const { setGameError, clearGameError } = useGameError();
  const wsClient = useWsClient();
  const gameSession = useGameSession();

  const connectionType = ref<SetupConnectionType>("create");
  const gameId = ref<string>("");
  const connecting = ref(false);

  const routeGameId = computed(() => String(route.params.id ?? ""));

  const redirectToIndexWithError = async (message: string): Promise<void> => {
    setGameError(message);
    await router.replace("/");
  };

  const connectFromRoute = async (container: HTMLDivElement | null): Promise<void> => {
    loadingIndicator.start({ force: true });

    try {
      await gameSession.connectJoinGame(routeGameId.value, container);
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Unknown game connection error.");
      await redirectToIndexWithError(message);
    } finally {
      loadingIndicator.finish();
    }
  };

  const connectFromSetup = async (request: CreateGameRequest): Promise<void> => {
    if (connecting.value) {
      return;
    }

    connecting.value = true;
    clearGameError();

    try {
      if (connectionType.value === "create") {
        const connectResponse = await wsClient.sendCreateGame(request);
        await navigateTo(`/${connectResponse.gameId}`);
      } else {
        await navigateTo(`/${gameId.value}`);
      }
    } catch (err: unknown) {
      wsClient.disconnect();
      setGameError(`Connection failed: ${getErrorMessage(err)}`);
    } finally {
      connecting.value = false;
    }
  };

  return {
    connectionType,
    gameId,
    connecting,
    connectFromSetup,
    routeGameId,
    gameRunning: gameSession.gameRunning,
    connectFromRoute,
    disconnectRouteGame: () => gameSession.disconnect(),
  };
};