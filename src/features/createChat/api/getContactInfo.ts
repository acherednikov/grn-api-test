import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials } from "@/shared/api/types";

import type { GetContactInfoResponse } from "./dto/types";

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
