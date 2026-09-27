import { memo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, Input, Spinner } from "@/shared/ui";
import { withErrorReset } from "@/shared/lib/withErrorReset";

import {
  createChatFormSchema,
  type CreateChatFormValues,
  useCheckAccount,
  useGetContactInfo,
  useCreateChatSubmit,
} from "../model";

export const CreateChatForm = memo(function CreateChatForm() {
  const {
    control,
    handleSubmit,
    reset,
  } = useForm<CreateChatFormValues>({
    resolver: zodResolver(createChatFormSchema),
    defaultValues: { phone: "" },
  });

  const checkAccount = useCheckAccount();
  const getContactInfo = useGetContactInfo();

  const { onSubmit } = useCreateChatSubmit(checkAccount, getContactInfo);

  const isLoading = checkAccount.isPending;

  const resetServerError = () => {
    if (checkAccount.error) checkAccount.reset();
  };

  const handleChatCreate = async (values: CreateChatFormValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(handleChatCreate)}
      className="flex flex-col shrink-0 gap-2 p-4"
      noValidate
    >
      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            label="Номер контакта"
            placeholder="79991234567"
            error={fieldState.error?.message || checkAccount.error?.message}
            onChange={withErrorReset(field, resetServerError)}
            disabled={isLoading || !field.value}
          />
        )}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? <Spinner /> : "Новый чат"}
      </Button>
    </form>
  );
});
