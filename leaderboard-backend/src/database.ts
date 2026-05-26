import pg from "pg";
import { log } from "./logger.js";

const { Pool } = pg;

export type LeaderboardEntry = {
  id: number;
  rank: number;
  levelCode: string;
  playerNames: string[];
  timeMs: number;
  completedAt: string;
};

export type GameResult = {
  gameId: number;
  levelCode: string;
  playerNames: string[];
  timeMs: number;
  completedAt: string;
};

const DEFAULT_DATABASE_URL = "postgres://minesweeper:minesweeper@localhost:5432/minesweeper";

export default class Database {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL
  });

  async connect(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id BIGSERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL,
        level_code TEXT NOT NULL,
        username TEXT NOT NULL,
        player_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        time_ms INTEGER NOT NULL CHECK (time_ms > 0),
        completed_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await this.pool.query(`
      ALTER TABLE leaderboard_entries
      ADD COLUMN IF NOT EXISTS player_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
    `);

    await this.pool.query(`
      UPDATE leaderboard_entries
      SET player_names = ARRAY[username]
      WHERE player_names = ARRAY[]::TEXT[];
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS leaderboard_entries_level_time_idx
      ON leaderboard_entries (level_code, time_ms ASC, completed_at ASC);
    `);

    log.info("[leaderboard] Database is ready.");
  }

  async insertGameResult(result: GameResult): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO leaderboard_entries (game_id, level_code, username, player_names, time_ms, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [result.gameId, result.levelCode, result.playerNames[0] ?? "Anonymous", result.playerNames, result.timeMs, result.completedAt]
    );
  }

  async listEntries(levelCode: string, limit: number): Promise<LeaderboardEntry[]> {
    const queryResult = await this.pool.query<{
      id: string;
      rank: string;
      level_code: string;
      player_names: string[];
      time_ms: number;
      completed_at: Date;
    }>(
      `
        SELECT
          id,
          row_number() OVER (ORDER BY time_ms ASC, completed_at ASC, id ASC) AS rank,
          level_code,
          player_names,
          time_ms,
          completed_at
        FROM leaderboard_entries
        WHERE level_code = $1
        ORDER BY time_ms ASC, completed_at ASC, id ASC
        LIMIT $2
      `,
      [levelCode, limit]
    );

    return queryResult.rows.map((row) => ({
      id: Number(row.id),
      rank: Number(row.rank),
      levelCode: row.level_code,
      playerNames: row.player_names,
      timeMs: row.time_ms,
      completedAt: row.completed_at.toISOString()
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}