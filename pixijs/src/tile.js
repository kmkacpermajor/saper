export default class Tile {
    constructor(x, y, tileSize, sprite) {
        this.x = x;
        this.y = y;
        this.tileSize = tileSize;
        this.type = -1;
        this.sprite = this.createSprite(sprite);
    }

    createSprite(sprite){
        sprite.width = sprite.height = this.tileSize;
        sprite.x = this.x * this.tileSize;
        sprite.y = this.y * this.tileSize;
        sprite.eventMode = "static";
        sprite.cursor = "pointer";
        return sprite;
    }
}