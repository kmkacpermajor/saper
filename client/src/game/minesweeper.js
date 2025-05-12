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
    constructor(gameId, eventHandler){
        this._gameId = gameId;
        this.tileSize = 25;
        this.board = [];
        this.container = new Container();
        this.textures = {
            default: null,
            revealed: null,
            mine: null,
            flag: null,
            numbers: []
        };
        this.socket = new WebSocket("ws://192.168.1.6:8080");
        this.eventHandler = eventHandler;
        this._gameState = 0; // -1 lost 0 inprogress 1 won
        this._numBombs = 0;
        this.initialNumBombs = 0;
    }

    get gameId() {
        return this._gameId
    }

    set gameId(value) {
        this._gameId = value
        this.emitEvent('GAME_ID_UPDATE', value)
    }

    get gameState() {
        return this._gameState
    }

    set gameState(value) {
        this._gameState = value
        this.emitEvent('GAME_STATE_UPDATE', value)
    }

    get numBombs() {
        return this._numBombs
    }

    set numBombs(value) {
        this._numBombs = value
        this.emitEvent('NUM_BOMBS_UPDATE', value)
    }

    emitEvent(type, payload) {
        if (this.eventHandler) {
            // Use setTimeout to break potential synchronous recursion
            setTimeout(() => {
                this.eventHandler({ type, payload })
            }, 0)
        }
    }

    revealTile(y, x, type) {
        console.log(`Show tile : ${y}, ${x}`)
        this.board[y][x].type = type;
        this.renderBoard();
    }

    connect(gameId, rows, cols, numBombs) {
        const buf = new ArrayBuffer(5);
        const view = new DataView(buf);
        view.setUint8(0, 0x80);
        view.setUint8(1, gameId);
        view.setUint8(2, rows);
        view.setUint8(3, cols);
        view.setUint8(4, numBombs);
        this.socket.send(buf);
    }

    async init(rows, cols, numBombs) {
        if (this.initialized) return;

        // Tworzenie aplikacji PixiJS
        this.app = new Application();
        await this.app.init({  
            width: 0, height: 0, 
            backgroundColor: 0x1099bb 
        });
        await this.loadTextures();

        this.app.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        this.app.stage.addChild(this.container);

        // Załaduj tekstury
        await waitForOpenSocket(this.socket);

        this.socket.binaryType = 'arraybuffer';

        this.connect(this.gameId, rows, cols, numBombs);
        
        this.socket.onmessage = (event) => {
            const data = new DataView(event.data);
            const messageType = data.getUint8(0);
            console.log(`Got message type ${messageType}`);
            
            switch(messageType) {
                case 0x00: // connected
                    this.gameId = data.getUint8(1);
                    this.rows = data.getUint8(2);
                    this.cols = data.getUint8(3);
                    this.numBombs = data.getUint8(4);
                    this.initialNumBombs = this.numBombs;
                    this.app.renderer.resize(
                        this.cols*this.tileSize,
                        this.rows*this.tileSize,
                      );
                    this.loadBoard();
                    this.renderBoard();
                    break;
                case 0x01: // revealTiles
                    const tileCount = data.getUint16(1);
                        console.log(`${tileCount}`);
                        for (let i = 0; i < tileCount; i++) {
                        const offset = 3 + i * 5;
                        const y = data.getUint16(offset);
                        const x = data.getUint16(offset + 2);
                        const type = data.getInt8(offset + 4);
                        if (type === -1){
                            this.numBombs++;
                        }
                        if (type === 9){
                            this.numBombs--;
                        }
                        console.log(`${y}, ${x}, ${type}`);
                        this.revealTile(y, x, type);
                    }
                    break;
                    
                case 0x02: // youLost
                    this.handleYouLost();
                    break;
                    
                case 0x03: // youWin
                    this.handleYouWin();
                    break;

                case 0x04:
                    this.handleReset();
                    break;
                    
                default:
                    console.error('Unknown message type:', messageType);
            }
        };
    }

    handleReset(){
        this.loadBoard();
        this.gameState = 0;
        this.numBombs = this.initialNumBombs;
    }

    handleYouLost() {
        this.gameState = -1;
    }

    handleYouWin() {
        this.gameState = 1;
    }

    async loadTextures() {
        for (let i = 0; i < 9; i++) {
            this.textures.numbers[i] = await Assets.load(`src/assets/${i}.png`);
        }
        this.textures.default = await Assets.load('src/assets/revealed.png');
        this.textures.mine = await Assets.load('src/assets/mine.png');
        this.textures.flag = await Assets.load('src/assets/flag.png');
    }

    sendShowTile(tile) {
        if (this.board[tile.y][tile.x].type !== -1) return;
        const buf = new ArrayBuffer(5);
        const view = new DataView(buf);
        view.setUint8(0, 0x81);
        view.setUint16(1, tile.y);
        view.setUint16(3, tile.x);
        this.socket.send(buf);
    }
    
    sendNewGame() {
        const buf = new ArrayBuffer(1);
        const view = new DataView(buf);
        view.setUint8(0, 0x82);
        this.socket.send(buf);
    }

    loadBoard() {
        this.board = Array.from({ length: this.cols }, (_, y) => 
            Array.from({ length: this.rows }, (_, x) => {
                const tile = new Tile(y, x, this.tileSize, new Sprite(this.textures.default));
                tile.sprite.on("pointerdown", (event) => {
                    if (event.button === 0) this.sendShowTile(tile);
                    if (event.button === 2) this.sendFlagTile(tile);
                });
                this.container.addChild(tile.sprite);
                return tile;
            })
        );
    }

    sendReset(){
        console.log("send reset");
        const buf = new ArrayBuffer(1);
        const view = new DataView(buf);
        view.setUint8(0, 0x82);
        this.socket.send(buf);
    }

    sendFlagTile(tile) {
        if (this.board[tile.y][tile.x].type !== -1 && this.board[tile.y][tile.x].type !== 9) return;
        const buf = new ArrayBuffer(6);
        const view = new DataView(buf);
        view.setUint8(0, 0x83);
        view.setUint16(1, tile.y);
        view.setUint16(3, tile.x);
        view.setUint8(5, this.board[tile.y][tile.x].type === 9);
        this.socket.send(buf);
    }

    renderBoard() {
        for (let y = 0; y < this.cols; y++) {
            for (let x = 0; x < this.rows; x++) {
                const tile = this.board[y][x];
                tile.sprite.texture = this.textures.default;
                if (tile.type === -1){
                    tile.sprite.texture = this.textures.default;
                }else if(tile.type === 9){
                    tile.sprite.texture = this.textures.flag;
                }else if(tile.type === 10){
                    tile.sprite.texture = this.textures.mine;
                }else{
                    tile.sprite.texture = this.textures.numbers[tile.type];
                }
            }
        }
    }

    handleMessage(message) {
    // Handle messages from Vue
        console.log('Message from UI:', message)
    }
    
    cleanup() {
        // Clean up all game resources
        this.app.ticker.stop()
        this.app.stage.destroy({ children: true })
        this.initialized = false
      }
}