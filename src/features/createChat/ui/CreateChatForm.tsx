import { memo, useState, type SubmitEvent } from "react";

import { useChatStore } from "@/entities/chat";
import { useSessionStore } from "@/entities/session";
import { Button, Input } from "@/shared/ui";

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
      addChat(chat);
      setPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 p-4"
    >
      <Input
        name="phone"
        label="Номер получателя"
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
        {isSubmitting ? "Проверка…" : "Новый чат"}
      </Button>
    </form>
  );
});
