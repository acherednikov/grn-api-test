import { useNavigate } from "react-router-dom";
import type { UseMutationResult } from "@tanstack/react-query";
import type { SubmitHandler } from "react-hook-form";

import { useSessionStore } from "@/entities/session";
import { InstanceState, type InstanceStateResponse } from "@/shared/api/types";

import type { AuthFormValues } from "./schema";
import { getInstanceStateDescription } from "../lib/getInstanceStateDescription";

type CheckInstanceState = UseMutationResult<
  InstanceStateResponse,
  Error,
  AuthFormValues
>;

export function useAuthSubmit(checkInstanceState: CheckInstanceState) {
  const navigate = useNavigate();
  const setCredentials = useSessionStore((s) => s.setCredentials);

  const onSubmit: SubmitHandler<AuthFormValues> = async (values) => {
    const instanceState = await checkInstanceState.mutateAsync(values);

    if (instanceState.stateInstance === InstanceState.Authorized) {
      setCredentials(values);
      navigate("/chat", { replace: true });
      return;
    }

    throw new Error(getInstanceStateDescription(instanceState.stateInstance));
  };

  return { onSubmit };
}
