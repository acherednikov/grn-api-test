import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials } from "@/shared/api/types";

export async function deleteNotification(
  credentials: GreenApiCredentials,
  receiptId: number,
): Promise<void> {
  const url = buildGreenApiUrl(credentials, "deleteNotification", receiptId);
  await greenApiFetch(url, { method: "DELETE" });
}
