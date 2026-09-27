import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { useSessionStore } from "@/entities/session";
import { Button, Input, Spinner } from "@/shared/ui";
import { DEFAULT_GREEN_API_URL } from "@/shared/config/constants";
import { InstanceState, InstanceStateResponse } from "@/shared/api/types";

import {
  getInstanceStateDescription,
  validateCredentials,
  type AuthFormValues,
} from "../model/validateCredentials";
import { getInstanceState } from "../api/getInstanceState";

export function AuthForm() {
  const navigate = useNavigate();

  const setCredentials = useSessionStore((s) => s.setCredentials);

  const [values, setValues] = useState<AuthFormValues>({
    idInstance: "",
    apiTokenInstance: "",
  });
  const [errors, setErrors] = useState<ReturnType<typeof validateCredentials>>(
    {},
  );

  const checkInstanceState = useMutation<InstanceStateResponse>({
    mutationFn: () => getInstanceState({ ...values, apiUrl: DEFAULT_GREEN_API_URL }),
    // onSettled: () => {},
  });

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    checkInstanceState.reset();

    const formErrors = validateCredentials(values);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    const instanceState = await checkInstanceState.mutateAsync();

    if (instanceState.stateInstance === InstanceState.Authorized) {
      setCredentials(values);
      navigate("/chat", { replace: true });
    }

    if (instanceState.stateInstance !== InstanceState.Authorized) {
      throw new Error(getInstanceStateDescription(instanceState.stateInstance));
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-dark-bg p-6 shadow-sm"
    >
      {checkInstanceState.error && <p className="text-red-500 font-semibold text-center">
        {checkInstanceState.error.message}
      </p>}
      <Input
        name="idInstance"
        label="ID инстанса (idInstance)"
        value={values.idInstance}
        onChange={(e) =>
          setValues((v) => ({ ...v, idInstance: e.target.value }))
        }
        error={errors.idInstance}
        autoComplete="off"
      />
      <Input
        name="apiTokenInstance"
        label="API-токен (apiTokenInstance)"
        type="password"
        value={values.apiTokenInstance}
        onChange={(e) =>
          setValues((v) => ({ ...v, apiTokenInstance: e.target.value }))
        }
        error={errors.apiTokenInstance}
        autoComplete="off"
      />
      <Button
        type="submit"
        disabled={checkInstanceState.isPending}
      >
        {checkInstanceState.isPending ? <Spinner /> : "Вход"}
      </Button>
    </form>
  );
}
