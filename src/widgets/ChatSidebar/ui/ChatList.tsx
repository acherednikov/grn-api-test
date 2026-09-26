import { memo } from "react";

import { ChatItem, useChatStore } from "@/entities/chat";

export const ChatList = memo(function ChatList() {
  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const setActiveChat = useChatStore((s) => s.setActiveChat);

  if (chats.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 text-sm text-neutral-500">
        Нет чатов
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 min-h-0">
      <h2 className="text-white pl-4 text-bold">Чаты</h2>
      <ul className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <li key={chat.id}>
            <ChatItem
              chat={chat}
              isActive={activeChatId === chat.chatId}
              onSelect={setActiveChat}
            />
          </li>
        ))}
      </ul>
    </div>
  );
});

