import { Container, Sprite, Texture } from "pixi.js";
import type { TileCoordinates } from "@saper/contracts";

export default class PlayerCursorOverlay {
  readonly container = new Container();

  private readonly tileSize: number;
  private readonly sprites = new Map<number, Sprite>();

  constructor(tileSize: number) {
    this.tileSize = tileSize;
    this.container.eventMode = "none";
    this.container.sortableChildren = false;
  }

  updatePlayerCursor(playerId: number, tile: TileCoordinates, tint: number): void {
    let sprite = this.sprites.get(playerId);

    if (!sprite) {
      sprite = new Sprite(Texture.WHITE);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = this.tileSize * 0.38;
      sprite.height = this.tileSize * 0.38;
      sprite.rotation = Math.PI / 4;
      sprite.alpha = 0.9;
      this.sprites.set(playerId, sprite);
      this.container.addChild(sprite);
    }

    sprite.tint = tint;
    sprite.position.set(
      tile.x * this.tileSize + this.tileSize * 0.5,
      tile.y * this.tileSize + this.tileSize * 0.5
    );
    sprite.visible = true;
  }

  removePlayerCursor(playerId: number): void {
    const sprite = this.sprites.get(playerId);
    if (!sprite) {
      return;
    }

    sprite.removeFromParent();
    sprite.destroy();
    this.sprites.delete(playerId);
  }

  clear(): void {
    for (const sprite of this.sprites.values()) {
      sprite.removeFromParent();
      sprite.destroy();
    }

    this.sprites.clear();
  }

  destroy(): void {
    this.clear();
    this.container.removeFromParent();
    this.container.destroy();
  }
}
