import { memo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { withErrorReset } from "@/shared/lib/withErrorReset";

import { createChatFormSchema, type CreateChatFormValues } from "../model/schema";
import { useCheckAccount } from "../model/useCheckAccount";
import { useGetContactInfo } from "../model/useGetContactInfo";
import { useCreateChatSubmit } from "../model/useCreateChatSubmit";

export const CreateChatForm = memo(function CreateChatForm() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
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
            disabled={isLoading}
          />
        )}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !isDirty}
      >
        {isLoading ? <Spinner /> : "Новый чат"}
      </Button>
    </form>
  );
});
