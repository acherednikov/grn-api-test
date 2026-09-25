import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials } from "@/shared/api/types";

export async function deleteNotification(
  credentials: GreenApiCredentials,
  receiptId: number,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const url = buildGreenApiUrl(credentials, "deleteNotification", receiptId);
  await greenApiFetch(url, {
    method: "DELETE",
    signal: options?.signal,
  });
}
