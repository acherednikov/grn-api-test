import { useMutation } from "@tanstack/react-query";

import { DEFAULT_GREEN_API_URL } from "@/shared/config/constants";
import type { InstanceStateResponse } from "@/shared/api/types";

import { getInstanceState } from "../api/getInstanceState";
import type { AuthFormValues } from "./schema";

export function useCheckInstanceState() {
  return useMutation<InstanceStateResponse, Error, AuthFormValues>({
    mutationFn: (values) =>
      getInstanceState({ ...values, apiUrl: DEFAULT_GREEN_API_URL }),
  });
}
