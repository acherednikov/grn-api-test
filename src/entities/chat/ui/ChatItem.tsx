import { memo } from "react";
import { cn } from "@/shared/lib/cn";

import type { Chat } from "../model/types";

type ChatItemProps = {
  chat: Chat;
  isActive: boolean;
  onSelect: (chatId: string) => void;
};

export const ChatItem = memo(function ChatItem({
  chat,
  isActive,
  onSelect,
}: ChatItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(chat.chatId)}
      className={cn(
        "w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-800 cursor-pointer",
        isActive && "bg-gray-700",
      )}
    >
      {chat.title}
    </button>
  );
});
