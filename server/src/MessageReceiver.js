
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

        if (requestedGameId === 0xFF){
            const rows = data.getUint8(2);
            const cols = data.getUint8(3);
            const mines = data.getUint8(4);
            this.currentGame = this.gameSessionManager.createNewGame(rows, cols, mines, this.ws);
        }else{
            this.currentGame = this.gameSessionManager.getGame(requestedGameId, this.ws);
        }

        if (!this.currentGame) return;

        this.currentGame.messageSender.addClient(this.ws);

        this.currentGame.messageSender.sendConfirmation(this.ws, this.currentGame); // send game parameters too and handle in client + add mine count to frontend

        if(this.currentGame.board) {
            const shownTiles = this.currentGame.board.getShownTiles();
            if(shownTiles) this.currentGame.messageSender.sendRevealTiles(shownTiles, this.ws);
            if(this.currentGame.gameEnded) this.currentGame.messageSender.sendGameOver(this.currentGame.gameWon);
        }
    }

    handleRevealTile(data){
        const y = data.getUint16(1);
        const x = data.getUint16(3);
        console.log(`Client wants to reveal tile ${y}, ${x}`);
        this.currentGame.revealTiles(y, x);
    }

    handleResetGame(data){
        console.log("received reset");
        this.currentGame.resetGame();
    }

    handleFlagTile(data){
        const y = data.getUint16(1);
        const x = data.getUint16(3);
        const flag = data.getUint8(5);
        if (!flag){
            console.log(`Client wants to flag tile ${x}, ${y}`);
            this.currentGame.flagTile(y, x);
        }else{
            console.log(`Client wants to unflag tile ${x}, ${y}`);
            this.currentGame.unflagTile(y, x);
        }
    }
}