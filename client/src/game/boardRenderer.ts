import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
import { TileType } from "@saper/contracts";
import Tile from "./tile";

type TilePointerHandler = (y: number, x: number, button: number) => void;

type TileTextures = {
  default: Texture | null;
  mine: Texture | null;
  flag: Texture | null;
  numbers: Texture[];
};

export default class BoardRenderer {
  readonly container = new Container();

  private readonly tileSize: number;
  private app: Application | null = null;
  private board: Tile[][] = [];
  private onPointer: TilePointerHandler | null = null;
  private rows = 0;
  private cols = 0;
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
    this.app = app;
    await this.loadTextures();
    app.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    app.canvas.addEventListener("pointerdown", this.handlePointerDown);
    app.canvas.style.cursor = "pointer";
    app.stage.addChild(this.container);
  }

  setupBoard(app: Application, rows: number, cols: number, onPointer: TilePointerHandler): void {
    this.rows = rows;
    this.cols = cols;
    app.renderer.resize(this.cols * this.tileSize, this.rows * this.tileSize);
    this.onPointer = onPointer;

    this.container.removeChildren();
    this.board = Array.from({ length: this.rows }, (_, y) =>
      Array.from({ length: this.cols }, (_, x) => {
        const defaultTexture = this.textures.default;
        if (!defaultTexture) {
          throw new Error("Default texture is not loaded");
        }

        const tile = new Tile(y, x, this.tileSize, new Sprite(defaultTexture));
        this.container.addChild(tile.sprite);
        return tile;
      })
    );
  }

  setTileType(y: number, x: number, nextType: TileType): { previousType: TileType; nextType: TileType } | null {
    const tile = this.board[y]?.[x];
    if (!tile) {
      return null;
    }

    const previousType = tile.type;
    if (previousType === nextType) {
      return { previousType, nextType };
    }

    tile.type = nextType;
    tile.sprite.texture = this.resolveTextureForTileType(nextType);

    return { previousType, nextType };
  }

  getTileType(y: number, x: number): TileType | undefined {
    return this.board[y]?.[x]?.type;
  }

  render(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.board[y][x];
        tile.sprite.texture = this.resolveTextureForTileType(tile.type);
      }
    }
  }

  destroy(): void {
    if (this.app) {
      this.app.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    }

    this.onPointer = null;
    this.container.removeChildren();
    this.board = [];
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.app || !this.onPointer) {
      return;
    }

    const rect = this.app.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const scaleX = this.app.canvas.width / rect.width;
    const scaleY = this.app.canvas.height / rect.height;
    const worldX = (event.clientX - rect.left) * scaleX;
    const worldY = (event.clientY - rect.top) * scaleY;
    const x = Math.floor(worldX / this.tileSize);
    const y = Math.floor(worldY / this.tileSize);

    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
      return;
    }

    this.onPointer(y, x, event.button);
  };

  private async loadTextures(): Promise<void> {
    for (let i = 0; i < 9; i++) {
      this.textures.numbers[i] = (await Assets.load(new URL(`/src/assets/${i}.png`, import.meta.url).href)) as Texture;
    }

    this.textures.default = (await Assets.load(new URL("/src/assets/revealed.png", import.meta.url).href)) as Texture;
    this.textures.mine = (await Assets.load(new URL("/src/assets/mine.png", import.meta.url).href)) as Texture;
    this.textures.flag = (await Assets.load(new URL("/src/assets/flag.png", import.meta.url).href)) as Texture;
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
}
