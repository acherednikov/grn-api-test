import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials, GetContactInfoResponse } from "@/shared/api/types";

export async function getContactInfo(
  credentials: GreenApiCredentials,
  chatId: string,
): Promise<GetContactInfoResponse> {
  const url = buildGreenApiUrl(credentials, "getContactInfo");
  return greenApiFetch<GetContactInfoResponse>(url, {
    method: "POST",
    body: JSON.stringify({ chatId }),
  });
}
