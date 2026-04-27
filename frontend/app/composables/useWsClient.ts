import {
	decodeServerMessage,
	type TileCoordinates,
	type ConnectResponse,
	type ServerMessage,
	type CreateGameRequest,
	type JoinGameRequest
} from "@saper/contracts";
import log from "~/utils/logger";

const HANDSHAKE_TIMEOUT_MS = 8000;

const normalizeError = (reason: unknown): Error => {
	if (reason instanceof Error) {
		return reason;
	}

	return new Error("Unknown handshake error.");
};

type PendingHandshake = {
	resolve: (response: ConnectResponse) => void;
	reject: (reason: unknown) => void;
};

const waitForOpenSocket = async (socket: WebSocket): Promise<void> => {
	await new Promise<void>((resolve) => {
		if (socket.readyState !== socket.OPEN) {
			socket.addEventListener("open", () => resolve(), { once: true });
			return;
		}

		resolve();
	});
};

class WsClient {
	constructor(private readonly wsUrl: string) {}

	private socket: WebSocket | undefined;
	private onServerMessage: ((message: ServerMessage) => void) | undefined;
	private pendingHandshake: PendingHandshake | undefined;

	private async connectSocket(onServerMessage?: (message: ServerMessage) => void): Promise<void> {
		this.disconnect();
		if (!this.wsUrl) {
			throw new Error("Missing `public.wsUrl` in runtime config.");
		}

		this.socket = new WebSocket(this.wsUrl);
		this.onServerMessage = onServerMessage;
		await waitForOpenSocket(this.socket);

		this.socket.binaryType = "arraybuffer";
		this.setupSocketHandlers();
	}

	async sendCreateGame(
		request: CreateGameRequest,
		onServerMessage?: (message: ServerMessage) => void
	): Promise<ConnectResponse> {
		await this.connectSocket(onServerMessage);
		const handshakePromise = this.beginHandshake();
		this.send(createGamePayload(request));
		return await handshakePromise;
	}

	async sendJoinGame(
		request: JoinGameRequest,
		onServerMessage?: (message: ServerMessage) => void
	): Promise<ConnectResponse> {
		await this.connectSocket(onServerMessage);
		const handshakePromise = this.beginHandshake();
		this.send(joinGamePayload(request));
		return await handshakePromise;
	}

	disconnect(): void {
		this.onServerMessage = undefined;
		this.rejectPendingHandshake(new Error("WebSocket disconnected."));

		if (this.socket) {
			this.socket.close();
			this.socket = undefined;
		}
	}

	private beginHandshake(): Promise<ConnectResponse> {
		this.rejectPendingHandshake(new Error("Handshake cancelled."));

		return new Promise<ConnectResponse>((resolve, reject) => {
			let settled = false;

			const timeoutId = window.setTimeout(() => {
				settleReject(new Error("Server did not confirm game setup in time."));
			}, HANDSHAKE_TIMEOUT_MS);

			const settleResolve = (response: ConnectResponse): void => {
				if (settled) {
					return;
				}

				settled = true;
				window.clearTimeout(timeoutId);
				resolve(response);
			};

			const settleReject = (reason: unknown): void => {
				if (settled) {
					return;
				}

				settled = true;
				window.clearTimeout(timeoutId);
				reject(normalizeError(reason));
			};

			this.pendingHandshake = {
				resolve: settleResolve,
				reject: settleReject
			};
		});
	}

	private resolvePendingHandshake(response: ConnectResponse): void {
		if (!this.pendingHandshake) {
			return;
		}

		const { resolve } = this.pendingHandshake;
		this.pendingHandshake = undefined;
		resolve(response);
	}

	private rejectPendingHandshake(reason: unknown): void {
		if (!this.pendingHandshake) {
			return;
		}

		const { reject } = this.pendingHandshake;
		this.pendingHandshake = undefined;
		reject(reason);
	}

	sendRevealTiles(tiles: TileCoordinates[]): void {
		if (tiles.length === 0) {
			return;
		}

		this.send(createRevealTilePayload(tiles));
	}

	sendFlagTile(tile: TileCoordinates, unflag: boolean): void {
		this.send(createFlagTilePayload(tile.y, tile.x, unflag));
	}

	sendCursorClick(tile: TileCoordinates): void {
		this.send(createCursorClickPayload(tile));
	}

	private send(payload: Uint8Array<ArrayBufferLike>): void {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			return;
		}

		this.socket.send(new Uint8Array(payload));
	}

	private setupSocketHandlers(): void {
		if (!this.socket) {
			return;
		}

		this.socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
			try {
				const message = decodeServerMessage(new Uint8Array(event.data));
				this.onServerMessage?.(message);

				if (!this.pendingHandshake) {
					return;
				}

				if (message.payload.oneofKind === "connect") {
					this.resolvePendingHandshake(message.payload.connect);
					return;
				}

				if (message.payload.oneofKind === "error") {
					this.rejectPendingHandshake(new Error(message.payload.error.message));
				}
			} catch (error) {
				this.rejectPendingHandshake(error);
				log.error("[client] Failed to decode server message.", error);
			}
		};

		this.socket.onclose = () => {
			this.rejectPendingHandshake(new Error("WebSocket closed before handshake completed."));
			log.warn("[client] WebSocket closed.");
		};

		this.socket.onerror = (event) => {
			this.rejectPendingHandshake(new Error("WebSocket error during handshake."));
			log.error("[client] WebSocket error event.", event);
		};
	}
}

export const useWsClient = (): WsClient => {
	const runtimeConfig = useRuntimeConfig();
	const wsUrl = String(runtimeConfig.public.wsUrl ?? "");
	const wsClientState = useState<WsClient | null>("ws-client", () => null);

	if (import.meta.client) {
		return wsClientState.value ?? (wsClientState.value = new WsClient(wsUrl));
	}

	return new WsClient(wsUrl);
};

export { WsClient };
