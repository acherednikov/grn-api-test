import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials } from "@/shared/api/types";

import type { SendMessageRequest, SendMessageResponse } from "./dto/types";

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
