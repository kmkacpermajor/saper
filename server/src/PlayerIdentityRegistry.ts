import type { WebSocket } from "ws";

export default class PlayerIdentityRegistry {
  private nextPlayerId = 1;
  private readonly socketToPlayerId = new Map<WebSocket, number>();

  assignPlayerId(ws: WebSocket): number {
    const existingPlayerId = this.socketToPlayerId.get(ws);
    if (existingPlayerId !== undefined) {
      return existingPlayerId;
    }

    const playerId = this.nextPlayerId;
    this.nextPlayerId++;
    this.socketToPlayerId.set(ws, playerId);
    return playerId;
  }

  getPlayerId(ws: WebSocket): number | null {
    return this.socketToPlayerId.get(ws) ?? null;
  }

  removePlayer(ws: WebSocket): number | null {
    const playerId = this.socketToPlayerId.get(ws) ?? null;
    this.socketToPlayerId.delete(ws);
    return playerId;
  }
}
