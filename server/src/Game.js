import Board from './Board.js';

export default class Game {
    constructor(gameId) {
        this.gameId = gameId;
        this.board = new Board();
        this.clients = new Set(); // Track connected clients for this game
    }

    addClient(ws) {
        this.clients.add(ws);
        ws.on('close', () => this.removeClient(ws));
    }

    removeClient(ws) {
        this.clients.delete(ws);
    }

    broadcast(buffer) {
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(buffer);
            }
        });
    }

    sendRevealTiles(tiles, client=null) {
        const buffer = new ArrayBuffer(1 + 1 + tiles.length * 5);
        const view = new DataView(buffer);
        
        view.setUint8(0, 0x01); // revealTiles message type
        view.setUint8(1, tiles.length);
        
        tiles.forEach((tile, index) => {
            let offset = 2 + index * 5;
            view.setUint16(offset, tile.x);
            view.setUint16(offset + 2, tile.y);
            view.setInt8(offset + 4, tile.type);
        });
        
        if(client){
            client.send(buffer);
        }else{
            this.broadcast(buffer);
        }
    }
    
    resetGame() {
        this.board = new Board();
        // Send initial game state if needed
    }
    
    sendGameOver(isWin) {
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, isWin ? 0x03 : 0x02); // 0x03 = win, 0x02 = lose
        this.broadcast(buffer);
        this.resetGame();
    }
};