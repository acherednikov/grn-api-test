import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type {
  GreenApiCredentials,
  ReceiveNotificationResponse,
} from "@/shared/api/types";

export async function receiveNotification(
  credentials: GreenApiCredentials,
  options?: { signal?: AbortSignal },
): Promise<ReceiveNotificationResponse> {
  const url = buildGreenApiUrl(credentials, "receiveNotification");
  return greenApiFetch<ReceiveNotificationResponse>(url, {
    method: "GET",
    signal: options?.signal,
  });
}
