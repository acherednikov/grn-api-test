import {
  buildGreenApiUrl,
  greenApiFetch,
} from "@/shared/api/greenApiClient";
import type { GreenApiCredentials } from "@/shared/api/types";

// https://green-api.com/v3/docs/api/service/GetContactInfo/

export type GetContactInfoResponse = {
  avatar?: string;
  name?: string;
  contactName?: string;
  chatId?: string;
  chatType?: string;
  lastSeen?: string | null;
  phoneNumber?: number;
  phoneNumberTimestamp?: number;
};

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
