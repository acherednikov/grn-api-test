import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useSessionStore } from "@/entities/session";
import { Button, Input } from "@/shared/ui";
import { DEFAULT_GREEN_API_URL } from "@/shared/config/constants";

import {
  validateCredentials,
  type AuthFormValues,
} from "../model/validateCredentials";

// TODO: валидация инстанса через https://green-api.com/v3/docs/api/account/GetStateInstance/

export function AuthForm() {
  const navigate = useNavigate();

  const setCredentials = useSessionStore((s) => s.setCredentials);

  const [values, setValues] = useState<AuthFormValues>({
    idInstance: "",
    apiTokenInstance: "",
    apiUrl: DEFAULT_GREEN_API_URL,
  });
  const [errors, setErrors] = useState<ReturnType<typeof validateCredentials>>(
    {},
  );

  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    const nextErrors = validateCredentials(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setCredentials(values);
    navigate("/chat", { replace: true });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-dark-bg p-6 shadow-sm"
    >
      <p className="text-white font-semibold text-center">Убедитесь, что ваш инстанс авторизован</p>
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
      <Button type="submit">Вход</Button>
    </form>
  );
}
