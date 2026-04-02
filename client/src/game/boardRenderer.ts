import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
import { TileUpdate ,TileType } from "@saper/contracts";

type TileTextures = {
  default: Texture | null;
  mine: Texture | null;
  flag: Texture | null;
  numbers: Texture[];
};

type VisibleWorld = { x: number; y: number; width: number; height: number };

export default class BoardRenderer {
  readonly container = new Container();

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
  }

  async init(app: Application): Promise<void> {
    await this.loadTextures();
    app.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
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
  }

  renderTiles(tiles: ReadonlyArray<TileUpdate>): void {
    for (const tile of tiles) {
      if (this.tileTypes[tile.y]?.[tile.x] === undefined) {
        continue;
      }

      this.tileTypes[tile.y][tile.x] = tile.type;
      const tileIndex = this.toTileIndex(tile.y, tile.x);
      const poolIndex = this.tileToPoolIndex.get(tileIndex);
      if (poolIndex === undefined) {
        continue;
      }

      this.spritePool[poolIndex].texture = this.resolveTextureForTileType(tile.type);
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
        const sprite = this.spritePool[poolCursor];
        const tileType = this.tileTypes[y][x];
        const tileIndex = this.toTileIndex(y, x);

        sprite.visible = true;
        sprite.x = x * this.tileSize;
        sprite.y = y * this.tileSize;
        sprite.texture = this.resolveTextureForTileType(tileType);

        this.poolAssignments[poolCursor] = tileIndex;
        this.tileToPoolIndex.set(tileIndex, poolCursor);
        poolCursor++;
      }
    }

    for (let i = poolCursor; i < this.spritePool.length; i++) {
      this.spritePool[i].visible = false;
      this.poolAssignments[i] = null;
    }
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.removeChildren();
    this.tileTypes = [];
    this.spritePool = [];
    this.poolAssignments = [];
    this.tileToPoolIndex.clear();
  }

  private async loadTextures(): Promise<void> {
    const sheet = await Assets.load("/src/assets/spritesheet.json");

    const get = (name: string): Texture => {
      const texture = sheet.textures[name];
      if (!texture) {
        throw new Error(`Missing frame in spritesheet: ${name}`);
      }
      return texture;
    };

    this.textures.default = get("unrevealed");
    this.textures.mine = get("bomb");
    this.textures.flag = get("flag");
    this.textures.numbers = Array.from({ length: 9 }, (_, i) => get(`${i}`));
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
      return this.textures.numbers[type - TileType.EMPTY];
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
      this.spritePool.push(sprite);
      this.poolAssignments.push(null);
      this.container.addChild(sprite);
    }
  }

  private hideAllPoolSprites(): void {
    this.tileToPoolIndex.clear();
    for (let i = 0; i < this.spritePool.length; i++) {
      this.spritePool[i].visible = false;
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
