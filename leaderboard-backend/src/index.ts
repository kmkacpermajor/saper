import http from "node:http";
import Database from "./database.js";
import PubSubSubscriber from "./PubSubSubscriber.js";
import { isRankedLevelCode, rankedLevelCodes } from "./levels.js";
import { log } from "./logger.js";

const host = process.env.HOST || "0.0.0.0";
const parsedPort = Number(process.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 8090;
const STARTUP_RETRY_DELAY_MS = 2000;
const STARTUP_RETRIES = 30;
const PAGE_SIZE = 10;
const MAX_ENTRIES = 100;

type ServerReadiness = {
  ready: boolean;
};

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const retryStartup = async (label: string, action: () => Promise<void>): Promise<void> => {
  for (let attempt = 1; attempt <= STARTUP_RETRIES; attempt++) {
    try {
      await action();
      return;
    } catch (error) {
      if (attempt === STARTUP_RETRIES) {
        throw error;
      }

      log.warn({ err: error }, `[leaderboard] ${label} is not ready yet (${attempt}/${STARTUP_RETRIES}).`);
      await wait(STARTUP_RETRY_DELAY_MS);
    }
  }
};

const parseLimit = (value: string | null): number => {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) {
    return PAGE_SIZE;
  }

  return Math.min(limit, PAGE_SIZE);
};

const parsePage = (value: string | null): number => {
  const page = Number(value);
  if (!Number.isInteger(page) || page <= 0) {
    return 1;
  }

  return Math.min(page, MAX_ENTRIES / PAGE_SIZE);
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

const createServer = (database: Database, readiness?: ServerReadiness): http.Server =>
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
      const isReady = readiness?.ready ?? true;
      sendJson(response, isReady ? 200 : 503, { status: isReady ? "ok" : "starting" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/levels") {
      sendJson(response, 200, { levels: rankedLevelCodes });
      return;
    }

    if (request.method === "GET" && url.pathname === "/leaderboard") {
      if (readiness && !readiness.ready) {
        sendJson(response, 503, { error: "Service is starting." });
        return;
      }

      const levelCode = String(url.searchParams.get("level") ?? "").toUpperCase();
      if (!isRankedLevelCode(levelCode)) {
        sendJson(response, 400, { error: "Invalid or missing level." });
        return;
      }

      const limit = parseLimit(url.searchParams.get("limit"));
      const page = parsePage(url.searchParams.get("page"));
      const offset = (page - 1) * limit;
      void database
        .listEntries(levelCode, limit, offset, MAX_ENTRIES)
        .then(({ entries, totalEntries }) => sendJson(response, 200, {
          entries,
          page,
          pageSize: limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit)
        }))
        .catch((error: unknown) => {
          log.error({ err: error }, "[leaderboard] Failed to list entries.");
          sendJson(response, 500, { error: "Could not load leaderboard." });
        });
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  });

const database = new Database();
const readiness: ServerReadiness = { ready: false };
const server = createServer(database, readiness);
server.listen(port, host, () => {
  log.info(`[leaderboard] HTTP server started on http://${host}:${port}`);
});

const startDependencies = async (): Promise<void> => {
  await retryStartup("Database", () => database.connect());

  const subscriber = new PubSubSubscriber(database);
  await retryStartup("Pub/Sub", () => subscriber.listen());

  readiness.ready = true;
  log.info("[leaderboard] Dependencies are ready.");
};

const shutdown = (exitCode = 0): void => {
  server.close(() => {
    void database.close().finally(() => process.exit(exitCode));
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startDependencies().catch((error: unknown) => {
  log.error({ err: error }, "[leaderboard] Failed to initialize dependencies.");
  shutdown(1);
});