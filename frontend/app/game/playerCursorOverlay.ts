import { Container, Graphics } from "pixi.js";
import type { TileCoordinates } from "@saper/contracts";

export default class PlayerCursorOverlay {
  readonly container = new Container();

  private readonly tileSize: number;
  private readonly cursors = new Map<number, Graphics>();

  constructor(tileSize: number) {
    this.tileSize = tileSize;
    this.container.eventMode = "none";
    this.container.sortableChildren = false;
    this.container.cacheAsTexture(true); // TODO: probably should redo it as a sprite and use tint
  }

  private drawCornerPath(
    graphics: Graphics,
    left: number,
    top: number,
    right: number,
    bottom: number,
    cornerSize: number
  ): void {
    graphics
      .moveTo(left, top + cornerSize)
      .lineTo(left, top)
      .lineTo(left + cornerSize, top)
      .moveTo(right - cornerSize, top)
      .lineTo(right, top)
      .lineTo(right, top + cornerSize)
      .moveTo(left, bottom - cornerSize)
      .lineTo(left, bottom)
      .lineTo(left + cornerSize, bottom)
      .moveTo(right - cornerSize, bottom)
      .lineTo(right, bottom)
      .lineTo(right, bottom - cornerSize);
  }

  updatePlayerCursor(playerId: number, tile: TileCoordinates, tint: number): void {
    let cursor = this.cursors.get(playerId);

    if (!cursor) {
      cursor = new Graphics();
      this.cursors.set(playerId, cursor);
      this.container.addChild(cursor);
    }

    const inset = this.tileSize * 0.16;
    const halfSize = this.tileSize * 0.5 - inset;
    const cornerSize = Math.max(3, this.tileSize * 0.2);
    const strokeWidth = Math.max(1.25, this.tileSize * 0.06);

    const left = -halfSize;
    const top = -halfSize;
    const right = halfSize;
    const bottom = halfSize;

    cursor.clear();

    // Dark under-stroke keeps the marker visible on bright and dark tiles.
    this.drawCornerPath(cursor, left, top, right, bottom, cornerSize);
    cursor.stroke({
      width: strokeWidth + 1.2,
      color: 0x000000,
      alpha: 0.22,
      cap: "round",
      join: "round"
    });

    this.drawCornerPath(cursor, left, top, right, bottom, cornerSize);
    cursor.stroke({
      width: strokeWidth,
      color: tint,
      alpha: 0.95,
      cap: "round",
      join: "round"
    });

    cursor.position.set(
      tile.x * this.tileSize + this.tileSize * 0.5,
      tile.y * this.tileSize + this.tileSize * 0.5
    );
    cursor.visible = true;
  }

  removePlayerCursor(playerId: number): void {
    const cursor = this.cursors.get(playerId);
    if (!cursor) {
      return;
    }

    cursor.removeFromParent();
    cursor.destroy();
    this.cursors.delete(playerId);
  }

  clear(): void {
    for (const cursor of this.cursors.values()) {
      cursor.removeFromParent();
      cursor.destroy();
    }

    this.cursors.clear();
  }

  destroy(): void {
    this.clear();
    this.container.removeFromParent();
    this.container.destroy();
  }
}
