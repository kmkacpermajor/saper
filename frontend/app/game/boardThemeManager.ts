import { Assets, Texture } from "pixi.js";

type ReadyTileTextures = {
  default: Texture;
  mine: Texture;
  flag: Texture;
  numbers: Texture[];
};

export type TileTextures = {
  default: Texture | null;
  mine: Texture | null;
  flag: Texture | null;
  numbers: Texture[];
};

type ThemeChangeHandler = () => void;

type LoadedSheet = { textures: Record<string, Texture> };

export default class BoardThemeManager {
  private readonly onThemeChange: ThemeChangeHandler;
  private darkModeQuery: MediaQueryList | null = null;
  private prefersDarkMode = false;
  private lightTextures: TileTextures | null = null;
  private darkTextures: TileTextures | null = null;
  private textures: TileTextures = {
    default: null,
    mine: null,
    flag: null,
    numbers: []
  };
  private readonly handleDarkModePreferenceChange = (event: MediaQueryListEvent): void => {
    this.applyThemeMode(event.matches);
  };

  constructor(onThemeChange: ThemeChangeHandler) {
    this.onThemeChange = onThemeChange;
  }

  async init(): Promise<void> {
    this.bindDarkModePreference();
    await this.preloadThemeTextures();
    this.applyThemeTextures(this.prefersDarkMode);
  }

  destroy(): void {
    this.unbindDarkModePreference();
    void Assets.unload("board-spritesheet-light");
    void Assets.unload("board-spritesheet-dark");
  }

  getTextures(): ReadyTileTextures {
    const { default: defaultTexture, mine, flag, numbers } = this.textures;

    if (!defaultTexture || !mine || !flag) {
      throw new Error("Tile textures are not initialized");
    }

    return {
      default: defaultTexture,
      mine,
      flag,
      numbers
    };
  }

  private extractTexturesFromSheet(
    sheet: LoadedSheet,
    keyPrefix: string
  ): TileTextures {
    const get = (name: string): Texture => {
      const texture = sheet.textures[`${keyPrefix}${name}`];
      if (!texture) {
        throw new Error(`Missing frame in spritesheet: ${keyPrefix}${name}`);
      }
      return texture;
    };

    return {
      default: get("unrevealed"),
      mine: get("bomb"),
      flag: get("flag"),
      numbers: Array.from({ length: 9 }, (_, i) => get(`${i}`))
    };
  }

  private async preloadThemeTextures(): Promise<void> {
    const lightSheet = (await Assets.load({
      alias: "board-spritesheet-light",
      src: "/game/spritesheet.json"
    })) as LoadedSheet;

    const darkSheet = (await Assets.load({
      alias: "board-spritesheet-dark",
      src: "/game/spritesheet_dark.json",
    })) as LoadedSheet;

    this.lightTextures = this.extractTexturesFromSheet(lightSheet, "light_");
    this.darkTextures = this.extractTexturesFromSheet(darkSheet, "dark_");
  }

  private applyThemeTextures(useDarkMode: boolean): void {
    const selectedTextures = useDarkMode ? this.darkTextures : this.lightTextures;

    if (!selectedTextures) {
      throw new Error("Theme textures are not initialized");
    }

    this.textures = {
      default: selectedTextures.default,
      mine: selectedTextures.mine,
      flag: selectedTextures.flag,
      numbers: [...selectedTextures.numbers]
    };
  }

  private bindDarkModePreference(): void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    this.darkModeQuery = query;
    this.prefersDarkMode = query.matches;
    query.addEventListener("change", this.handleDarkModePreferenceChange);
  }

  private unbindDarkModePreference(): void {
    if (!this.darkModeQuery) {
      return;
    }

    this.darkModeQuery.removeEventListener("change", this.handleDarkModePreferenceChange);
    this.darkModeQuery = null;
  }

  private applyThemeMode(enabled: boolean): void {
    if (this.prefersDarkMode === enabled) {
      return;
    }

    this.prefersDarkMode = enabled;
    this.applyThemeTextures(enabled);
    this.onThemeChange();
  }
}
