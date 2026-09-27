import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, Input, Spinner } from "@/shared/ui";

import {
  authFormSchema,
  type AuthFormValues,
  useAuthSubmit,
  useCheckInstanceState,
} from "../model";
import { withErrorReset } from "../lib/withErrorReset";

export function AuthForm() {
  const {
    control,
    handleSubmit,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    defaultValues: { idInstance: "", apiTokenInstance: "" },
    // mode: "onBlur",
  });

  const checkInstanceState = useCheckInstanceState();

  const { onSubmit } = useAuthSubmit(checkInstanceState);

  const resetServerError = () => {
    if (checkInstanceState.error) checkInstanceState.reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-dark-bg p-6 shadow-sm"
      noValidate
    >
      {checkInstanceState.error && (
        <p className="text-red-500 font-semibold text-center">
          {checkInstanceState.error.message}
        </p>
      )}
      <Controller
        name="idInstance"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            label="ID инстанса (idInstance)"
            autoComplete="off"
            error={fieldState.error?.message}
            onChange={withErrorReset(field, resetServerError)}
          />
        )}
      />
      <Controller
        name="apiTokenInstance"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            label="API-токен (apiTokenInstance)"
            type="password"
            autoComplete="off"
            error={fieldState.error?.message}
            onChange={withErrorReset(field, resetServerError)}
          />
        )}
      />
      <Button type="submit" disabled={checkInstanceState.isPending}>
        {checkInstanceState.isPending ? <Spinner /> : "Вход"}
      </Button>
    </form>
  );
}
