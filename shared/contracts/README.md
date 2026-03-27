# @saper/contracts

Wspolny pakiet kontraktow klient-serwer oparty o Protobuf.

## Zrodlo prawdy

- Schema: `proto/game.proto`
- Wygenerowany kod: `src/generated/game.ts`
- Publiczny API (typy + enumy + codec + stale): `src/index.ts`

## Aktualizacja kontraktu

1. Zmien `proto/game.proto`.
2. Uruchom `pnpm run generate`.
3. Uruchom `pnpm run typecheck`.
4. Commituj razem: `.proto` + wygenerowane pliki + ewentualne zmiany w `index.ts`/uzyciach.

## Skrypty

- `pnpm run generate` - generuje kod TypeScript przez protobuf-ts.
- `pnpm run typecheck` - sprawdza TypeScript strict.

## Logowanie (dev)

- Serwer: ustaw `LOG_LEVEL` (`debug`, `info`, `warn`, `error`, `silent`).
- Klient (Vite): ustaw `VITE_LOG_LEVEL` (`debug`, `info`, `warn`, `error`, `silent`).
