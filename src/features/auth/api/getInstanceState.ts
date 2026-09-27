import { buildGreenApiUrl, greenApiFetch } from "@/shared/api/greenApiClient";
import { GreenApiCredentials } from "@/shared/api/types";

import type { InstanceStateResponse } from "./dto";

// https://green-api.com/v3/docs/api/account/GetStateInstance/

export async function getInstanceState(
  credentials: GreenApiCredentials,
): Promise<InstanceStateResponse> {
  const url = buildGreenApiUrl(credentials, "getStateInstance");
  return greenApiFetch<InstanceStateResponse>(url, {
    method: "GET",
  });
}