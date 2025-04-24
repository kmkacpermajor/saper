import { Application, Sprite, Assets, Container } from 'pixi.js';
import Tile from './tile.js';

const waitForOpenSocket = async(socket) => {
    return new Promise((resolve) => {
      if (socket.readyState !== socket.OPEN) {
        socket.addEventListener("open", (_) => {
          resolve();
        })
      } else {
        resolve();
      }
    });
  };

export default class Minesweeper {
    constructor(gameId, rows = 10, cols = 10, tileSize = 40, mineCount = 5){
        this.gameId = gameId;
        this.rows = rows;
        this.cols = cols;
        this.mineCount = mineCount;
        this.tileSize = tileSize;
        this.board = [];
        this.container = new Container();
        this.textures = {
            default: null,
            revealed: null,
            mine: null,
            flag: null,
            numbers: []
        };
        this.socket = new WebSocket("ws://localhost:8080");
    }

    revealTile(x, y, type) {
        console.log(`Show tile : ${x}, ${y}`)
        if (this.board[x][y].isRevealed || this.board[x][y].isFlagged) return;

        this.board[x][y].isRevealed = true;
        this.board[x][y].isMine = type === 10;
        this.board[x][y].isFlagged = type === 9;
        this.board[x][y].adjacentMines = type < 9 ? type : this.board[x][y].adjacentMines;
        if (this.board[x][y].isMine) {
            alert("Game Over!");
            return;
        }

        this.renderBoard();
    }

    connect(gameId) {
        const buf = new ArrayBuffer(2);
        const view = new DataView(buf);
        view.setUint8(0, 0x80);
        view.setUint8(1, gameId);
        this.socket.send(buf);
    }

    async init() {
        await waitForOpenSocket(this.socket);

        this.socket.binaryType = 'arraybuffer';

        this.connect(0x01);

        this.socket.onmessage = (event) => {
            const data = new DataView(event.data);
            const messageType = data.getUint8(0);
            console.log('Got message');
            
            switch(messageType) {
                case 0x00: // connected
                    const gameId = data.getUint8(1);
                    this.gameId = gameId;
                    break;
                case 0x01: // revealTiles
                    const tileCount = data.getUint8(1);
                    for (let i = 0; i < tileCount; i++) {
                        const offset = 2 + i * 5;
                        const x = data.getUint16(offset);
                        const y = data.getUint16(offset + 2);
                        const type = data.getUint8(offset + 4);
                        this.revealTile(x,y, type);
                    }
                    break;
                    
                case 0x02: // youLost
                    handleYouLost();
                    break;
                    
                case 0x03: // youWin
                    handleYouWin();
                    break;
                    
                default:
                    console.error('Unknown message type:', messageType);
            }
        };

        // Tworzenie aplikacji PixiJS
        this.app = new Application();
        await this.app.init({ 
            width: this.cols * this.tileSize, height: this.rows * this.tileSize, backgroundColor: 0x1099bb 
        });
        document.body.appendChild(this.app.canvas);
        this.app.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        this.app.stage.addChild(this.container);

        // Załaduj tekstury
        await this.loadTextures();

        // Tworzenie planszy i sprite'ów po załadowaniu tekstur
        this.loadBoard();
        this.renderBoard();
    }

    async loadTextures() {
        for (let i = 0; i < 9; i++) {
            this.textures.numbers[i] = await Assets.load(`${i}.png`);
        }
        this.textures.default = await Assets.load('revealed.png');
        this.textures.mine = await Assets.load('mine.png');
        this.textures.flag = await Assets.load('flag.png');
    }

    sendShowTile(tile) {
        if (this.board[tile.x][tile.y].isRevealed) return;
        const buf = new ArrayBuffer(5);
        const view = new DataView(buf);
        view.setUint8(0, 0x81);
        view.setUint16(1, tile.x);
        view.setUint16(3, tile.y);
        this.socket.send(buf);
    }
    
    sendNewGame() {
        const buf = new ArrayBuffer(1);
        const view = new DataView(buf);
        view.setUint8(0, 0x82);
        this.socket.send(buf);
    }

    loadBoard() {
        this.board = Array.from({ length: this.rows }, (_, x) => 
            Array.from({ length: this.cols }, (_, y) => {
                const tile = new Tile(x, y, this.tileSize, new Sprite(this.textures.default));
                tile.sprite.on("pointerdown", (event) => {
                    if (event.button === 0) this.sendShowTile(tile);
                    if (event.button === 2) this.toggleFlag(tile);
                });
                this.container.addChild(tile.sprite);
                return tile;
            })
        );
    }

    toggleFlag(tile) {
        if (!this.board[tile.x][tile.y].isRevealed) {
            this.board[tile.x][tile.y].isFlagged = !this.board[tile.x][tile.y].isFlagged;
            this.renderBoard();
        }
    }

    renderBoard() {
        for (let x = 0; x < this.rows; x++) {
            for (let y = 0; y < this.cols; y++) {
                const tile = this.board[x][y];
                tile.sprite.texture = tile.isRevealed
                    ? tile.isMine
                        ? this.textures.mine
                        : this.textures.numbers[tile.adjacentMines]
                    : tile.isFlagged
                    ? this.textures.flag
                    : this.textures.default;
            }
        }
    }
}