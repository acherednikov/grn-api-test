import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type {
  GreenApiCredentials,
  SendMessageRequest,
  SendMessageResponse,
} from "@/shared/api/types";

export async function sendMessage(
  credentials: GreenApiCredentials,
  payload: SendMessageRequest,
): Promise<SendMessageResponse> {
  const url = buildGreenApiUrl(credentials, "sendMessage");
  return greenApiFetch<SendMessageResponse>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
