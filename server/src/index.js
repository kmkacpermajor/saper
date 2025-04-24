import { WebSocketServer } from 'ws';

class Tile {
    constructor() {
        this.isMine = false;
        this.isRevealed = false;
        this.isFlagged = false;
        this.adjacentMines = 0;
    }

    countAdjacentMines(board, x, y) {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                let nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < board.length && ny < board[0].length && board[nx][ny].isMine) {
                    count++;
                }
            }
        }
        return count;
    }

    getType() {
        if (this.isFlagged) return 9;
        if (this.isMine) return 10;
        return this.adjacentMines;
    }
}

class Board {
    constructor(rows = 10, cols = 10, mineCount = 5) {
        this.rows = rows;
        this.cols = cols;
        this.mineCount = mineCount;
        this.board = [];
        this.gameOver = false;

        this.createBoard();
    }

    createBoard() {
        this.board = Array.from({ length: this.rows }, () => 
            Array.from({ length: this.cols }, () => new Tile()));

        let minesPlaced = 0;
        while (minesPlaced < this.mineCount) {
            let x = Math.floor(Math.random() * this.rows);
            let y = Math.floor(Math.random() * this.cols);
            if (!this.board[x][y].isMine) {
                this.board[x][y].isMine = true;
                minesPlaced++;
            }
        }

        for (let x = 0; x < this.rows; x++) {
            for (let y = 0; y < this.cols; y++) {
                if (!this.board[x][y].isMine) {
                    this.board[x][y].adjacentMines = this.board[x][y].countAdjacentMines(this.board, x, y);
                }
            }
        }
    }

    tilesToReveal(x, y) {
        if (this.gameOver || this.board[x][y].isRevealed) return [];

        if (this.board[x][y].isMine) {
            this.gameOver = true;
            this.board[x][y].isRevealed = true;
            return [{x: x, y: y, type: this.board[x][y].getType()}];
        }
        
        const tilesToReveal = [];
        const queue = [[x, y]];
        
        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            
            // Skip if already revealed or out of bounds
            if (cx < 0 || cy < 0 || cx >= this.board.length || cy >= this.board[0].length || this.board[cx][cy].isRevealed) {
                continue;
            }
            
            // Reveal the tile
            this.board[cx][cy].isRevealed = true;
            tilesToReveal.push({x: cx, y: cy, type: this.board[cx][cy].getType()});
            
            // If it's a zero, add adjacent tiles to queue
            if (this.board[cx][cy].adjacentMines === 0) {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx !== 0 || dy !== 0) {
                            queue.push([cx + dx, cy + dy]);
                        }
                    }
                }
            }
        }
        
        return tilesToReveal;
    }
}

class Game {
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
        if (this.clients.size === 0) {
            // Clean up the game if no clients remain
            games.delete(this.gameId);
        }
    }

    broadcast(buffer) {
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(buffer);
            }
        });
    }

    sendRevealTiles(tiles) {
        const buffer = new ArrayBuffer(1 + 1 + tiles.length * 5);
        const view = new DataView(buffer);
        
        view.setUint8(0, 0x01); // revealTiles message type
        view.setUint8(1, tiles.length);
        
        tiles.forEach((tile, index) => {
            let offset = 2 + index * 5;
            view.setUint16(offset, tile.x);
            view.setUint16(offset + 2, tile.y);
            view.setUint8(offset + 4, tile.type);
        });
        
        this.broadcast(buffer);
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
    }
}

const wss = new WebSocketServer({ port: 8080 });
const games = new Map(); // gameId -> Game instance
const MAX_GAME_ID = 254;

function createNewGame() {
    // Find an available gameId
    for (let gameId = 0; gameId <= MAX_GAME_ID; gameId++) {
        if (!games.has(gameId)) {
            const game = new Game(gameId);
            games.set(gameId, game);
            return game;
        }
    }
    return null; // No available game IDs
}

wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.binaryType = 'arraybuffer';

    let currentGame = null;

    ws.on('message', (message) => {
        const data = new DataView(message);
        const messageType = data.getUint8(0);
        
        // First message must be connect
        if (!currentGame && messageType !== 0x80) {
            ws.close();
            return;
        }

        switch(messageType) {
            case 0x80: // connect
                console.log("Client wants to connect to server");
                const requestedGameId = data.getUint8(1);
                
                if (requestedGameId === 0xFF) {
                    // Request to create a new game
                    currentGame = createNewGame();
                    if (!currentGame) {
                        ws.close();
                        return;
                    }
                } else {
                    // Try to get existing game or create new one if it doesn't exist
                    currentGame = games.get(requestedGameId);
                    if (!currentGame) {
                        currentGame = new Game(requestedGameId);
                        games.set(requestedGameId, currentGame);
                    }
                }
                
                currentGame.addClient(ws);
                
                // Send confirmation with gameId
                const buffer = new ArrayBuffer(2);
                const view = new DataView(buffer);
                view.setUint8(0, 0x00); // connect response
                view.setUint8(1, currentGame.gameId);
                ws.send(buffer, { binary: true });
                break;
                
            case 0x81: // revealTile
                const x = data.getUint16(1);
                const y = data.getUint16(3);
                currentGame.sendRevealTiles(currentGame.board.tilesToReveal(x, y));
                break;
                
            case 0x82: // resetGame
                currentGame.resetGame();
                break;
                
            default:
                console.error('Unknown message type:', messageType);
        }
    });
    
    ws.on('close', () => {
        if (currentGame) {
            currentGame.removeClient(ws);
        }
        console.log('Client disconnected');
    });
});