import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
import { TileType } from "@saper/contracts";
import Tile from "./tile";

type TileTextures = {
  default: Texture | null;
  mine: Texture | null;
  flag: Texture | null;
  numbers: Texture[];
};

export default class BoardRenderer {
  readonly container = new Container();

  private readonly tileSize: number;
  private board: Tile[][] = [];
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
    await this.loadTextures();
    app.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    app.stage.addChild(this.container);
  }

  setupBoard(app: Application, rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;
    app.renderer.resize(this.cols * this.tileSize, this.rows * this.tileSize);

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

  renderTile(y: number, x: number, type: TileType): boolean {
    const tile = this.board[y]?.[x];
    if (!tile) {
      return false;
    }

    tile.sprite.texture = this.resolveTextureForTileType(type);
    return true;
  }

  destroy(): void {
    this.container.removeChildren();
    this.board = [];
  }

  private async loadTextures(): Promise<void> {
    const sheet = await Assets.load('/src/assets/spritesheet.json');

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
}
