import { Application, Container, Rectangle, Texture } from "pixi.js";
import { TileUpdate, TileType, type TileCoordinates } from "@saper/contracts";
import BoardThemeManager from "./boardThemeManager";
import PlayerCursorOverlay from "./playerCursorOverlay";
import SpritePool from "./spritePool";

type VisibleWorld = { x: number; y: number; width: number; height: number };
type VisibleTileBounds = { minX: number; minY: number; maxX: number; maxY: number };

export default class BoardRenderer {
  readonly container = new Container();
  private readonly playerCursorOverlay: PlayerCursorOverlay;
  private readonly themeManager: BoardThemeManager;

  private readonly tileSize: number;
  private readonly overscanTiles = 2;
  private rows = 0;
  private cols = 0;
  private tileTypes: TileType[][] = [];
  private readonly spritePool: SpritePool;

  constructor(tileSize: number) {
    this.tileSize = tileSize;
    this.playerCursorOverlay = new PlayerCursorOverlay(tileSize);
    this.themeManager = new BoardThemeManager(() => this.refreshVisibleSpriteTextures());
    this.spritePool = new SpritePool(this.container, tileSize);
  }

  async init(app: Application): Promise<void> {
    await app.init({
      width: 1,
      height: 1,
      autoDensity: true,
      backgroundAlpha: 0,
    });

    await this.themeManager.init();
    this.container.addChild(this.playerCursorOverlay.container);
    app.stage.addChild(this.container);
  }

  setupBoard(rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;
    this.tileTypes = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => TileType.HIDDEN)
    );

    this.spritePool.hideAll();
    this.playerCursorOverlay.clear();
    this.container.hitArea = new Rectangle(0, 0, cols * this.tileSize, rows * this.tileSize);
  }

  updatePlayerCursor(playerId: number, tile: TileCoordinates): void {
    this.playerCursorOverlay.updatePlayerCursor(playerId, tile);
    this.container.setChildIndex(this.playerCursorOverlay.container, this.container.children.length - 1);
  }

  removePlayerCursor(playerId: number): void {
    this.playerCursorOverlay.removePlayerCursor(playerId);
  }

  clearPlayerCursors(): void {
    this.playerCursorOverlay.clear();
  }

  renderTiles(tiles: ReadonlyArray<TileUpdate>, onlyChangeTexture: boolean = false): void {
    for (const tile of tiles) {
      if (this.tileTypes[tile.y]?.[tile.x] === undefined) {
        continue;
      }

      const tileIndex = this.toTileIndex(tile.y, tile.x);
      const sprite = this.spritePool.getSpriteForTile(tileIndex);

      if (!onlyChangeTexture) {
        this.tileTypes[tile.y]![tile.x] = tile.type;
      }

      if (!sprite) {
        continue;
      }

      sprite.texture = this.resolveTextureForTileType(tile.type);
      sprite.interactiveChildren = false;
      sprite.cullable = true;
    }
  }

  updateVisibleWorld(view: VisibleWorld): void {
    if (this.rows === 0 || this.cols === 0) {
      return;
    }

    const bounds = this.getVisibleTileBounds(view);
    if (!bounds) {
      this.spritePool.hideAll();
      return;
    }

    const requiredSprites = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
    this.spritePool.ensureSize(requiredSprites, this.themeManager.getTextures().default);
    this.spritePool.resetMapping();

    let poolCursor = 0;
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const tileType = this.tileTypes[y]![x]!;
        const tileIndex = this.toTileIndex(y, x);

        this.spritePool.assignTile(
          poolCursor,
          tileIndex,
          x,
          y,
          this.resolveTextureForTileType(tileType)
        );
        poolCursor++;
      }
    }

    this.spritePool.hideUnused(poolCursor);

    this.container.setChildIndex(this.playerCursorOverlay.container, this.container.children.length - 1);
  }

  destroy(): void {
    this.themeManager.destroy();
    this.spritePool.destroy();
    this.playerCursorOverlay.destroy();
    this.container.removeFromParent();
    this.container.removeChildren();
    this.tileTypes = [];
  }

  private refreshVisibleSpriteTextures(): void {
    if (this.cols === 0) {
      return;
    }

    this.spritePool.forEachAssigned((tileIndex, sprite) => {
      const y = Math.floor(tileIndex / this.cols);
      const x = tileIndex % this.cols;
      const tileType = this.tileTypes[y]?.[x];

      if (tileType === undefined) {
        return;
      }

      sprite.texture = this.resolveTextureForTileType(tileType);
    });
  }

  private resolveTextureForTileType(type: TileType): Texture {
    const textures = this.themeManager.getTextures();

    if (type === TileType.FLAGGED) {
      return textures.flag;
    }

    if (type === TileType.MINE) {
      return textures.mine;
    }

    if (type >= TileType.EMPTY && type <= TileType.EIGHT) {
      return textures.numbers[type - TileType.EMPTY]!;
    }

    return textures.default;
  }

  private getVisibleTileBounds(view: VisibleWorld): VisibleTileBounds | null {
    const minX = this.clampToRange(Math.floor(view.x / this.tileSize) - this.overscanTiles, 0, this.cols - 1);
    const minY = this.clampToRange(Math.floor(view.y / this.tileSize) - this.overscanTiles, 0, this.rows - 1);
    const maxX = this.clampToRange(
      Math.floor((view.x + view.width) / this.tileSize) + this.overscanTiles,
      0,
      this.cols - 1
    );
    const maxY = this.clampToRange(
      Math.floor((view.y + view.height) / this.tileSize) + this.overscanTiles,
      0,
      this.rows - 1
    );

    if (maxX < minX || maxY < minY) {
      return null;
    }

    return { minX, minY, maxX, maxY };
  }

  private toTileIndex(y: number, x: number): number {
    return y * this.cols + x;
  }

  private clampToRange(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
