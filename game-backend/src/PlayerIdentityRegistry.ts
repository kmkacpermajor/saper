import type { WebSocket } from "ws";

export default class PlayerIdentityRegistry {
  private nextPlayerId = 1;
  private readonly socketToPlayerId = new Map<WebSocket, number>();
  private readonly playerNames = new Map<number, string>();

  assignPlayerId(ws: WebSocket, username: string): number {
    const existingPlayerId = this.socketToPlayerId.get(ws);
    if (existingPlayerId !== undefined) {
      this.playerNames.set(existingPlayerId, username);
      return existingPlayerId;
    }

    const playerId = this.nextPlayerId;
    this.nextPlayerId++;
    this.socketToPlayerId.set(ws, playerId);
    this.playerNames.set(playerId, username);
    return playerId;
  }

  getPlayerId(ws: WebSocket): number | null {
    return this.socketToPlayerId.get(ws) ?? null;
  }

  removePlayer(ws: WebSocket): number | null {
    const playerId = this.socketToPlayerId.get(ws) ?? null;
    this.socketToPlayerId.delete(ws);
    if (playerId !== null) {
      this.playerNames.delete(playerId);
    }
    return playerId;
  }

  getPlayerNames(): string[] {
    return Array.from(this.playerNames.entries())
      .sort(([leftPlayerId], [rightPlayerId]) => leftPlayerId - rightPlayerId)
      .map(([, username]) => username);
  }
}
