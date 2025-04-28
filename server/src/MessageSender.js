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

    sendConfirmation(ws, gameId) {
        // Send confirmation with gameId
        const buffer = new ArrayBuffer(2);
        const view = new DataView(buffer);
        view.setUint8(0, 0x00); // connect response
        view.setUint8(1, gameId);
        ws.send(buffer, { binary: true });
    }

    sendRevealTiles(tiles, client=null) {
        const buffer = new ArrayBuffer(1 + 1 + tiles.length * 5);
        const view = new DataView(buffer);
        
        view.setUint8(0, 0x01);
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

    sendGameOver(isWin) {
        console.log(`Game over. Game is ${isWin ? 'won' : 'lost'}`);
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, isWin ? 0x03 : 0x02); // 0x03 = win, 0x02 = lose
        this.broadcast(buffer);
    }
}