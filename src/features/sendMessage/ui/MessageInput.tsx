import { useState,  type SubmitEvent, type ChangeEvent } from "react";

import { MAX_MESSAGE_LENGTH } from "@/shared/config/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { SendIcon } from "@/shared/ui/icons/SendIcon";

import { useSendMessage } from "../model/useSendMessage";

type MessageInputProps = {
  chatId: string | null;
};

export const MessageInput = function MessageInput({ chatId }: MessageInputProps) {
  const [text, setText] = useState("");

  const { send, error } = useSendMessage(chatId);

  const onMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    send(text);
    setText("");
  };

  const disabled = !chatId;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-dark-bg p-3 max-xl:mx-3"
    >
      {!!error ? <p className="text-xs text-red-500">{error.message}</p> : null}
      <div className="flex gap-2">
        <Input
          className="border-none"
          placeholder={chatId ? "Сообщение…" : "Выберите чат"}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={onMessageChange}
          disabled={disabled}
        />
        <Button type="submit" disabled={disabled || !text.trim()}>
          <SendIcon />
        </Button>
      </div>
    </form>
  );
}
