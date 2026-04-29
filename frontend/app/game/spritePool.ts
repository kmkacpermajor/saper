import { Container, Sprite, Texture } from "pixi.js";

type AssignedSpriteHandler = (tileIndex: number, sprite: Sprite) => void;

export default class SpritePool {
  private readonly container: Container;
  private readonly tileSize: number;
  private sprites: Sprite[] = [];
  private poolAssignments: Array<number | null> = [];
  private readonly tileToPoolIndex = new Map<number, number>();

  constructor(container: Container, tileSize: number) {
    this.container = container;
    this.tileSize = tileSize;
  }

  ensureSize(requiredSprites: number, defaultTexture: Texture): void {
    if (requiredSprites <= this.sprites.length) {
      return;
    }

    const missingSprites = requiredSprites - this.sprites.length;
    for (let i = 0; i < missingSprites; i++) {
      const sprite = new Sprite(defaultTexture);
      sprite.width = this.tileSize;
      sprite.height = this.tileSize;
      sprite.renderable = false;
      sprite.eventMode = "static";
      sprite.cursor = "default";
      this.sprites.push(sprite);
      this.poolAssignments.push(null);
      this.container.addChild(sprite);
    }
  }

  resetMapping(): void {
    this.tileToPoolIndex.clear();
  }

  hideAll(): void {
    this.tileToPoolIndex.clear();
    for (let i = 0; i < this.sprites.length; i++) {
      this.sprites[i]!.renderable = false;
      this.sprites[i]!.eventMode = "none";
    }

    this.poolAssignments.fill(null);
  }

  assignTile(
    poolIndex: number,
    tileIndex: number,
    x: number,
    y: number,
    texture: Texture
  ): void {
    const sprite = this.sprites[poolIndex]!;

    sprite.renderable = true;
    sprite.x = x * this.tileSize;
    sprite.y = y * this.tileSize;
    sprite.texture = texture;
    sprite.cursor = "pointer";
    sprite.cullable = true;
    sprite.interactiveChildren = false;

    this.poolAssignments[poolIndex] = tileIndex;
    this.tileToPoolIndex.set(tileIndex, poolIndex);
  }

  hideUnused(startIndex: number): void {
    for (let i = startIndex; i < this.sprites.length; i++) {
      this.sprites[i]!.renderable = false;
      this.sprites[i]!.eventMode = "none";
      this.poolAssignments[i] = null;
    }
  }

  getSpriteForTile(tileIndex: number): Sprite | null {
    const poolIndex = this.tileToPoolIndex.get(tileIndex);
    if (poolIndex === undefined) {
      return null;
    }

    return this.sprites[poolIndex] ?? null;
  }

  forEachAssigned(handler: AssignedSpriteHandler): void {
    for (let i = 0; i < this.poolAssignments.length; i++) {
      const tileIndex = this.poolAssignments[i];
      if (tileIndex == null) {
        continue;
      }

      const sprite = this.sprites[i];
      if (!sprite) {
        continue;
      }

      handler(tileIndex, sprite);
    }
  }

  destroy(): void {
    this.sprites = [];
    this.poolAssignments = [];
    this.tileToPoolIndex.clear();
  }
}
