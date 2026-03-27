import {
	ClientMessage as ClientMessageType,
	ServerMessage as ServerMessageType,
	type ClientMessage as ClientMessageModel,
	type ServerMessage as ServerMessageModel
} from "./generated/game.js";

export * from "./generated/game.js";

export const CONTRACT_VERSION = 1;
export const NEW_GAME_ID = 0xff;

const createClientMessage = (
	message: Omit<Partial<ClientMessageModel>, "contractVersion"> & { contractVersion?: number }
): ClientMessageModel =>
	ClientMessageType.create({
		contractVersion: message.contractVersion ?? CONTRACT_VERSION,
		payload: { oneofKind: undefined },
		...message
	});

const createServerMessage = (
	message: Omit<Partial<ServerMessageModel>, "contractVersion"> & { contractVersion?: number }
): ServerMessageModel =>
	ServerMessageType.create({
		contractVersion: message.contractVersion ?? CONTRACT_VERSION,
		payload: { oneofKind: undefined },
		...message
	});

export const encodeClientMessage = (
	message: Omit<Partial<ClientMessageModel>, "contractVersion"> & { contractVersion?: number }
): Uint8Array => ClientMessageType.toBinary(createClientMessage(message));

export const decodeClientMessage = (buffer: Uint8Array): ClientMessageModel =>
	ClientMessageType.fromBinary(buffer);

export const encodeServerMessage = (
	message: Omit<Partial<ServerMessageModel>, "contractVersion"> & { contractVersion?: number }
): Uint8Array => ServerMessageType.toBinary(createServerMessage(message));

export const decodeServerMessage = (buffer: Uint8Array): ServerMessageModel =>
	ServerMessageType.fromBinary(buffer);
