import http from "node:http";
import Database from "./database.js";
import { isRankedLevelCode, rankedLevelCodes } from "./levels.js";
import { log } from "./logger.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parseLimit = (value: string | null): number => {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
};

const sendJson = (response: http.ServerResponse, statusCode: number, body: unknown): void => {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(body));
};

export const createServer = (database: Database): http.Server =>
  http.createServer((request, response) => {
    if (!request.url) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/levels") {
      sendJson(response, 200, { levels: rankedLevelCodes });
      return;
    }

    if (request.method === "GET" && url.pathname === "/leaderboard") {
      const levelCode = String(url.searchParams.get("level") ?? "").toUpperCase();
      if (!isRankedLevelCode(levelCode)) {
        sendJson(response, 400, { error: "Invalid or missing level." });
        return;
      }

      const limit = parseLimit(url.searchParams.get("limit"));
      void database
        .listEntries(levelCode, limit)
        .then((entries) => sendJson(response, 200, { entries }))
        .catch((error: unknown) => {
          log.error({ err: error }, "[leaderboard] Failed to list entries.");
          sendJson(response, 500, { error: "Could not load leaderboard." });
        });
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  });