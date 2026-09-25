import type { GreenApiCredentials } from "./types";

const USE_PROXY = import.meta.env.DEV;

/**
 * Строит URL метода GREEN-API.
 * Формат: `{apiUrl}/waInstance{id}/{method}/{token}[/{pathAfterToken}]`
 * В dev запросы идут через Vite proxy (/api/green → api.green-api.com).
 */
export function buildGreenApiUrl(
  credentials: GreenApiCredentials,
  method: string,
  pathAfterToken?: string | number,
): string {
  const base = credentials.apiUrl.replace(/\/$/, "");
  const suffix =
    pathAfterToken === undefined || pathAfterToken === ""
      ? ""
      : `/${pathAfterToken}`;
  const path = `/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}${suffix}`;

  if (USE_PROXY) {
    const withoutHost = base.replace(/^https?:\/\/[^/]+/, "");
    return `/api/green${withoutHost}${path}`;
  }

  return `${base}${path}`;
}

export class GreenApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "GreenApiError";
  }
}

export async function greenApiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new GreenApiError(
      `GREEN-API: ${response.status}`,
      response.status,
      text,
    );
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
