import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials } from "@/shared/api/types";

import type { ReceiveNotificationResponse } from "./dto";

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
