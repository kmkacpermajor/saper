export default class MessageSender {
    constructor() {
        this.clients = new Set();
    }

    addClient(ws) {
        this.clients.add(ws);
        ws.on('close', () => this.removeClient(ws));
    }

    removeClient(ws) {
        console.log('Client disconnected');
        this.clients.delete(ws);
    }

    broadcast(buffer) {
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(buffer);
            }
        });
    }

    sendConfirmation(ws, game) {
        // Send confirmation with gameId
        const buffer = new ArrayBuffer(5);
        const view = new DataView(buffer);
        view.setUint8(0, 0x00); // connect response
        view.setUint8(1, game.gameId);
        view.setUint8(2, game.rows);
        view.setUint8(3, game.cols);
        view.setUint8(4, game.numBombs);
        ws.send(buffer, { binary: true });
    }

    sendReset(){
        console.log("Server wants to reset");
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, 0x04);
        this.broadcast(buffer);
    }

    sendRevealTiles(tiles, client=null) {
        const buffer = new ArrayBuffer(1 + 2 + tiles.length * 5);
        const view = new DataView(buffer);
        
        console.log(tiles.length);
        view.setUint8(0, 0x01);
        view.setUint16(1, tiles.length);
        
        tiles.forEach((tile, index) => {
            let offset = 3 + index * 5;
            view.setUint16(offset, tile.y);
            view.setUint16(offset + 2, tile.x);
            view.setInt8(offset + 4, tile.type);
        });
        
        if(client){
            client.send(buffer);
        }else{
            this.broadcast(buffer);
        }
    }

    sendGameOver(isWin) {
        console.log(`Game over. Game is ${isWin ? 'won' : 'lost'}`);
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, isWin ? 0x03 : 0x02); // 0x03 = win, 0x02 = lose
        this.broadcast(buffer);
    }
}