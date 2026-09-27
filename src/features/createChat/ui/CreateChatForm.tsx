import { memo, useState, type SubmitEvent } from "react";

import { useChatStore } from "@/entities/chat";
import { useSessionStore } from "@/entities/session";
import { Button, Input, Spinner } from "@/shared/ui";

import { createChatFromPhone } from "../model/createChatFromPhone";

export const CreateChatForm = memo(function CreateChatForm() {
  const addChat = useChatStore((s) => s.addChat);
  const credentials = useSessionStore((s) => s.credentials);

  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const chat = await createChatFromPhone(phone, credentials);
      if (chat) addChat(chat);
      setPhone("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось создать чат");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col shrink-0 gap-2 p-4"
    >
      <Input
        name="phone"
        label="Номер контакта"
        placeholder="79991234567"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setError(null);
        }}
        error={error ?? undefined}
        disabled={isSubmitting}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={!phone.trim() || isSubmitting}
      >
        {isSubmitting ? <Spinner /> : "Новый чат"}
      </Button>
    </form>
  );
});
