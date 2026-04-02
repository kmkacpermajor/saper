import { Application, Assets } from "pixi.js";
import BoardRenderer from "@/game/boardRenderer";
import log from "@/services/logger";

const spritesheetUrl = "/src/assets/spritesheet.json";

let warmupPromise: Promise<void> | null = null;
let warmupApp: Application | null = null;
let warmupRenderer: BoardRenderer | null = null;
let assetsPromise: Promise<void> | null = null;

export const prefetchGameAssets = (): Promise<void> => {
  if (assetsPromise) {
    return assetsPromise;
  }

  assetsPromise = Assets.load(spritesheetUrl)
    .then(() => {
      log.info("[client] Pixi assets prefetched.");
    })
    .catch((error) => {
      assetsPromise = null;
      log.warn("[client] Pixi asset prefetch failed.", error);
    });

  return assetsPromise;
};

export const getSharedPixiApplication = async (): Promise<Application> => {
  if (warmupPromise || warmupApp) {
    if (!warmupPromise && warmupApp) {
      return warmupApp;
    }

    await warmupPromise;
    if (!warmupApp) {
      throw new Error("Pixi warm-up failed to initialize the shared application.");
    }

    return warmupApp;
  }

  warmupPromise = (async () => {
    try {
      await prefetchGameAssets();

      warmupApp = new Application();
      await warmupApp.init({
        width: 64,
        height: 64,
        backgroundColor: 0x000000,
        backgroundAlpha: 0,
        preference: "webgpu",
        autoStart: false
      });

      warmupRenderer = new BoardRenderer(32);
      await warmupRenderer.init(warmupApp);
      warmupRenderer.setupBoard(1, 1);
      warmupRenderer.updateVisibleWorld({ x: 0, y: 0, width: 64, height: 64 });

      warmupApp.renderer.render({ container: warmupApp.stage });
      warmupRenderer.destroy();
      warmupRenderer = null;
      log.info("[client] Pixi warm-up completed.");
    } catch (error) {
      warmupRenderer?.destroy();
      warmupRenderer = null;
      warmupApp = null;
      warmupPromise = null;
      log.warn("[client] Pixi warm-up failed.", error);
    }
  })();

  await warmupPromise;
  if (!warmupApp) {
    throw new Error("Pixi warm-up failed to initialize the shared application.");
  }

  return warmupApp;
};

export const warmupPixi = (): Promise<void> => getSharedPixiApplication().then(() => undefined);

export const shutdownSharedPixiApplication = (): void => {
  warmupRenderer?.destroy();
  warmupRenderer = null;

  if (warmupApp) {
    warmupApp.stop();
    warmupApp.destroy(true, {
      children: true,
      texture: true
    });
  }

  warmupApp = null;
  warmupPromise = null;
  assetsPromise = null;
};