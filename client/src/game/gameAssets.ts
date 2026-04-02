import { Assets, type Texture } from "pixi.js";

type SpritesheetWithTextures = {
  textures: Record<string, Texture>;
};

const SPRITESHEET_PATH = "/src/assets/spritesheet.json";

let spritesheetPromise: Promise<SpritesheetWithTextures> | null = null;

export function loadGameSpritesheet(): Promise<SpritesheetWithTextures> {
  if (!spritesheetPromise) {
    spritesheetPromise = Assets.load(SPRITESHEET_PATH) as Promise<SpritesheetWithTextures>;
  }

  return spritesheetPromise;
}

export async function preloadGameAssets(): Promise<void> {
  await loadGameSpritesheet();
}
