import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials } from "@/shared/api/types";

export type CheckAccountResponse = {
  exist?: boolean;
  chatId?: string;
  fromCache?: boolean;
  status?: boolean;
  reason?: string;
};

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
