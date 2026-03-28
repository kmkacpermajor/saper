/// <reference types="vite/client" />

type AppLogLevel = "debug" | "info" | "warn" | "error" | "silent";

declare const __APP_LOG_LEVEL__: AppLogLevel;
