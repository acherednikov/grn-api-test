import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials } from "@/shared/api/types";

import type { CheckAccountResponse } from "./dto/types";

export async function checkAccount(
  credentials: GreenApiCredentials,
  phoneNumber: string,
): Promise<CheckAccountResponse> {
  const url = buildGreenApiUrl(credentials, "checkAccount");
  return greenApiFetch<CheckAccountResponse>(url, {
    method: "POST",
    body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
  });
}
