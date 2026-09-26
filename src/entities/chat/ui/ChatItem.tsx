import { memo } from "react";

import { cn } from "@/shared/lib/cn";
import { Avatar, Button } from "@/shared/ui";

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
    <Button
      variant="ghost"
      onClick={() => onSelect(chat.chatId)}
      className={cn(
        // "flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white bg-dark-bg hover:bg-gray-600 cursor-pointer",
        "w-full items-center gap-3 py-3 text-left bg-dark-bg hover:bg-gray-600",
        isActive && "bg-gray-700",
      )}
    >
      <Avatar
        name={chat.title}
        src={chat.avatar}
        wrapperClassName="h-10 w-10 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{chat.title}</p>
        {chat.contactName && chat.phone && chat.contactName !== chat.phone ? (
          <p className="truncate text-xs text-white/60">{chat.phone}</p>
        ) : null}
      </div>
    </Button>
  );
});
