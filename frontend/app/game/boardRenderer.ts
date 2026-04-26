import { Application, Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { TileUpdate, TileType, type TileCoordinates } from "@saper/contracts";
import PlayerCursorOverlay from "./playerCursorOverlay";
import { resolvePlayerCursorTint } from "./playerCursorPalette";

type TileTextures = {
  default: Texture | null;
  mine: Texture | null;
  flag: Texture | null;
  numbers: Texture[];
};

type VisibleWorld = { x: number; y: number; width: number; height: number };

export default class BoardRenderer {
  readonly container = new Container();
  private readonly playerCursorOverlay: PlayerCursorOverlay;
  private darkModeQuery: MediaQueryList | null = null;
  private prefersDarkMode = false;
  private lightTextures: TileTextures | null = null;
  private darkTextures: TileTextures | null = null;
  private readonly handleDarkModePreferenceChange = (event: MediaQueryListEvent): void => {
    this.applyThemeMode(event.matches);
  };

  private readonly tileSize: number;
  private readonly overscanTiles = 2;
  private rows = 0;
  private cols = 0;
  private tileTypes: TileType[][] = [];
  private spritePool: Sprite[] = [];
  private poolAssignments: Array<number | null> = [];
  private readonly tileToPoolIndex = new Map<number, number>();
  private textures: TileTextures = {
    default: null,
    mine: null,
    flag: null,
    numbers: []
  };

  constructor(tileSize: number) {
    this.tileSize = tileSize;
    this.playerCursorOverlay = new PlayerCursorOverlay(tileSize);
  }

  async init(app: Application): Promise<void> {
    await app.init({
      width: 1,
      height: 1,
      autoDensity: true,
      backgroundAlpha: 0,
    });

    this.bindDarkModePreference();
    await this.preloadThemeTextures();
    this.applyThemeTextures(this.prefersDarkMode);
    this.container.addChild(this.playerCursorOverlay.container);
    app.stage.addChild(this.container);
  }

  setupBoard(rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;
    this.tileTypes = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => TileType.HIDDEN)
    );

    this.hideAllPoolSprites();
    this.tileToPoolIndex.clear();
    for (let i = 0; i < this.poolAssignments.length; i++) {
      this.poolAssignments[i] = null;
    }
    this.playerCursorOverlay.clear();
    this.container.hitArea = new Rectangle(0, 0, cols * this.tileSize, rows * this.tileSize);
  }

  updatePlayerCursor(playerId: number, tile: TileCoordinates): void {
    this.playerCursorOverlay.updatePlayerCursor(playerId, tile, resolvePlayerCursorTint(playerId));
    this.container.setChildIndex(this.playerCursorOverlay.container, this.container.children.length - 1);
  }

  removePlayerCursor(playerId: number): void {
    this.playerCursorOverlay.removePlayerCursor(playerId);
  }

  clearPlayerCursors(): void {
    this.playerCursorOverlay.clear();
  }

  renderTiles(tiles: ReadonlyArray<TileUpdate>): void {
    for (const tile of tiles) {
      if (this.tileTypes[tile.y]?.[tile.x] === undefined) {
        continue;
      }

      this.tileTypes[tile.y]![tile.x] = tile.type;
      const tileIndex = this.toTileIndex(tile.y, tile.x);
      const poolIndex = this.tileToPoolIndex.get(tileIndex);
      if (poolIndex === undefined) {
        continue;
      }

      const sprite = this.spritePool[poolIndex]!;
      sprite.texture = this.resolveTextureForTileType(tile.type);
      sprite.interactiveChildren = false;
      sprite.cullable = true;
    }
  }

  updateVisibleWorld(view: VisibleWorld): void {
    if (this.rows === 0 || this.cols === 0) {
      return;
    }

    const minTileX = this.clampToRange(Math.floor(view.x / this.tileSize) - this.overscanTiles, 0, this.cols - 1);
    const minTileY = this.clampToRange(Math.floor(view.y / this.tileSize) - this.overscanTiles, 0, this.rows - 1);
    const maxTileX = this.clampToRange(
      Math.floor((view.x + view.width) / this.tileSize) + this.overscanTiles,
      0,
      this.cols - 1
    );
    const maxTileY = this.clampToRange(
      Math.floor((view.y + view.height) / this.tileSize) + this.overscanTiles,
      0,
      this.rows - 1
    );

    if (maxTileX < minTileX || maxTileY < minTileY) {
      this.hideAllPoolSprites();
      return;
    }

    const requiredSprites = (maxTileX - minTileX + 1) * (maxTileY - minTileY + 1);
    this.ensurePoolSize(requiredSprites);
    this.tileToPoolIndex.clear();

    let poolCursor = 0;
    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        const sprite = this.spritePool[poolCursor]!;
        const tileType = this.tileTypes[y]![x]!;
        const tileIndex = this.toTileIndex(y, x);

        sprite.visible = true;
        sprite.x = x * this.tileSize;
        sprite.y = y * this.tileSize;
        sprite.texture = this.resolveTextureForTileType(tileType);
        sprite.cursor = 'pointer';
        sprite.cullable = true;
        sprite.interactiveChildren = false;

        this.poolAssignments[poolCursor] = tileIndex;
        this.tileToPoolIndex.set(tileIndex, poolCursor);
        poolCursor++;
      }
    }

    for (let i = poolCursor; i < this.spritePool.length; i++) {
      this.spritePool[i]!.visible = false;
      this.poolAssignments[i] = null;
    }

    this.container.setChildIndex(this.playerCursorOverlay.container, this.container.children.length - 1);
  }

  destroy(): void {
    this.unbindDarkModePreference();
    this.playerCursorOverlay.destroy();
    this.container.removeFromParent();
    this.container.removeChildren();
    this.tileTypes = [];
    this.spritePool = [];
    this.poolAssignments = [];
    this.tileToPoolIndex.clear();
    void Assets.unload("board-spritesheet-light");
    void Assets.unload("board-spritesheet-dark");
  }

  private extractTexturesFromSheet(
    sheet: { textures: Record<string, Texture> },
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
    type LoadedSheet = { textures: Record<string, Texture> };

    const lightSheet = (await Assets.load({
      alias: "board-spritesheet-light",
      src: "/game/spritesheet.json"
    })) as LoadedSheet;

      const darkSheetOrNull = (await Assets.load({
        alias: "board-spritesheet-dark",
        src: "/game/spritesheet_dark.json",
      })) as LoadedSheet;

    this.lightTextures = this.extractTexturesFromSheet(lightSheet, "light_");
    this.darkTextures = this.extractTexturesFromSheet(darkSheetOrNull, "dark_")
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
    this.refreshVisibleSpriteTextures();
  }

  private refreshVisibleSpriteTextures(): void {
    if (this.cols === 0) {
      return;
    }

    for (let i = 0; i < this.poolAssignments.length; i++) {
      const tileIndex = this.poolAssignments[i];
      if (tileIndex == null) {
        continue;
      }

      const y = Math.floor(tileIndex / this.cols);
      const x = tileIndex % this.cols;
      const tileType = this.tileTypes[y]?.[x];

      if (tileType === undefined) {
        continue;
      }

      this.spritePool[i]!.texture = this.resolveTextureForTileType(tileType);
    }
  }

  private resolveTextureForTileType(type: TileType): Texture {
    if (!this.textures.default || !this.textures.flag || !this.textures.mine) {
      throw new Error("Tile textures are not initialized");
    }

    if (type === TileType.FLAGGED) {
      return this.textures.flag;
    }

    if (type === TileType.MINE) {
      return this.textures.mine;
    }

    if (type >= TileType.EMPTY && type <= TileType.EIGHT) {
      return this.textures.numbers[type - TileType.EMPTY]!;
    }

    return this.textures.default;
  }

  private ensurePoolSize(requiredSprites: number): void {
    if (requiredSprites <= this.spritePool.length) {
      return;
    }

    const defaultTexture = this.textures.default;
    if (!defaultTexture) {
      throw new Error("Default texture is not loaded");
    }

    const missingSprites = requiredSprites - this.spritePool.length;
    for (let i = 0; i < missingSprites; i++) {
      const sprite = new Sprite(defaultTexture);
      sprite.width = this.tileSize;
      sprite.height = this.tileSize;
      sprite.visible = false;
      sprite.eventMode = "static";
      sprite.cursor = "default";
      this.spritePool.push(sprite);
      this.poolAssignments.push(null);
      this.container.addChild(sprite);
    }
  }

  private hideAllPoolSprites(): void {
    this.tileToPoolIndex.clear();
    for (let i = 0; i < this.spritePool.length; i++) {
      this.spritePool[i]!.visible = false;
      this.poolAssignments[i] = null;
    }
  }

  private toTileIndex(y: number, x: number): number {
    return y * this.cols + x;
  }

  private clampToRange(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
