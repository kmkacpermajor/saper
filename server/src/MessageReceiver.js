
export default class MessageReceiver {
    constructor(gameSessionManager, ws){
        this.actionHandlers = {
            0x80: this.handleConnect.bind(this),
            0x81: this.handleRevealTile.bind(this),
            0x82: this.handleResetGame.bind(this),
            0x83: this.handleFlagTile.bind(this)
        };

        this.currentGame = null;
        this.gameSessionManager = gameSessionManager;
        this.ws = ws;
    }

    
    handleMessage(message){
        const data = new DataView(message);
        const messageType = data.getUint8(0);
        
        // First message must be connect
        if (!this.currentGame && messageType !== 0x80) {
            ws.close();
            return;
        }

        const handler = this.actionHandlers[messageType];
        if (!handler) {
            console.error('Unknown message type:', messageType);
        //   throw new Error('Unknown action');
        }
        return handler(data);
    }


    handleConnect(data) {
        console.log("Client wants to connect to server");
        const requestedGameId = data.getUint8(1);

        this.currentGame = this.gameSessionManager.getGame(requestedGameId, this.ws);
        
        // Send confirmation with gameId
        const buffer = new ArrayBuffer(2);
        const view = new DataView(buffer);
        view.setUint8(0, 0x00); // connect response
        view.setUint8(1, this.currentGame.gameId);
        this.ws.send(buffer, { binary: true });

        // send flagged tiles

        const shownTiles = [];
        for (let y = 0; y < this.currentGame.board.board.length; y++) {
            for (let x = 0; x < this.currentGame.board.board[y].length; x++) {
                const tile = this.currentGame.board.board[y][x];
                if (tile.isRevealed || tile.isFlagged) {
                    shownTiles.push({x, y, type: tile.getType()});
                }
            }
        }

        if(shownTiles) this.currentGame.sendRevealTiles(shownTiles, this.ws);
    }

    handleRevealTile(data){
        const x = data.getUint16(1);
        const y = data.getUint16(3);
        console.log(`Server wants to reveal tile ${x}, ${y}`);
        this.currentGame.sendRevealTiles(this.currentGame.board.tilesToReveal(x, y));
    }

    handleResetGame(data){
        this.currentGame.resetGame();
    }

    handleFlagTile(data){
        const x = data.getUint16(1);
        const y = data.getUint16(3);
        const flag = data.getUint8(5);
        if (!flag){
            console.log(`Server wants to flag tile ${x}, ${y}`);
            this.currentGame.board.board[y][x].isFlagged = true;
            this.currentGame.sendRevealTiles([{x, y, type: 9}]);
        }else{
            console.log(`Server wants to unflag tile ${x}, ${y}`);
            this.currentGame.board.board[y][x].isFlagged = false;
            this.currentGame.sendRevealTiles([{x, y, type: -1}]);
        }
    }
}