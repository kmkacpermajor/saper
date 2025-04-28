
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
        
        if (!this.currentGame) return;

        this.currentGame.messageSender.addClient(this.ws);

        this.currentGame.messageSender.sendConfirmation(this.ws, this.currentGame.gameId);

        const shownTiles = this.currentGame.board.getShownTiles();
        if(shownTiles) this.currentGame.messageSender.sendRevealTiles(shownTiles, this.ws);
    }

    handleRevealTile(data){
        const x = data.getUint16(1);
        const y = data.getUint16(3);
        console.log(`Server wants to reveal tile ${x}, ${y}`);
        this.currentGame.revealTiles(x, y);
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
            this.currentGame.flagTile(x, y);
        }else{
            console.log(`Server wants to unflag tile ${x}, ${y}`);
            this.currentGame.unflagTile(x, y);
        }
    }
}