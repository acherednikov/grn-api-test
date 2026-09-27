/** Базовый URL GREEN-API (можно переопределить в session) */
export const DEFAULT_GREEN_API_URL = import.meta.env.VITE_GREEN_API_URL || "https://api.green-api.com";

/** Интервал опроса ReceiveNotification, мс */
export const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 8000;

/** Максимальная длина текста сообщения (GREEN-API) */
export const MAX_MESSAGE_LENGTH = Number(import.meta.env.VITE_MAX_MESSAGE_LENGTH) || 4000;
