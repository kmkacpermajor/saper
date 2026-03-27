import { Sprite } from "pixi.js";
import { TileType } from "@saper/contracts";

export default class Tile {
  readonly x: number;
  readonly y: number;
  readonly tileSize: number;
  readonly sprite: Sprite;
  type: TileType;

  constructor(y: number, x: number, tileSize: number, sprite: Sprite) {
    this.x = x;
    this.y = y;
    this.tileSize = tileSize;
    this.type = TileType.HIDDEN;
    this.sprite = this.configureSprite(sprite);
  }

  private configureSprite(sprite: Sprite): Sprite {
    sprite.width = this.tileSize;
    sprite.height = this.tileSize;
    sprite.x = this.x * this.tileSize;
    sprite.y = this.y * this.tileSize;
    return sprite;
  }
}
