import { useChatStore } from "@/entities/chat";
import { MessageInput } from "@/features/sendMessage";
import { cn } from "@/shared/lib/cn";
import { Button, Avatar } from "@/shared/ui";
import { BackIcon } from "@/shared/ui/icons";

import { MessageList } from "./MessageList";

export function MessagePanel({ className }: { className?: string }) {
  const activeChat = useChatStore((s) => s.getActiveChat());
  console.log('> activeChat', activeChat);

  // const activeChatId = useChatStore((s) => s.activeChatId);
  // const activeChatTitle = useChatStore((s) =>
  //   s.activeChatId
  //     ? s.chats.find((c) => c.chatId === s.activeChatId)?.title ?? ""
  //     : "",
  // );
  const clearActiveChat = useChatStore((s) => s.clearActiveChat);

  return (
    <main
      className={cn(
        "flex min-w-0 flex-1 flex-col pb-3 bg-gray-600",
        className,
      )}
    >
      {activeChat && (
        <div className="flex items-center gap-3 bg-dark-bg px-4 py-3">
          <Button
            variant="ghost"
            className="!p-1"
            onClick={clearActiveChat}
            aria-label="Закрыть чат"
          >
            <BackIcon />
          </Button>
          <Avatar
            name={activeChat.title}
            src={activeChat.avatar}
            wrapperClassName="h-10 w-10 shrink-0"
          />
          <h2 className="text-sm font-semibold text-white">
            {activeChat.title}
          </h2>
        </div>
      )}
      <MessageList
        chatId={activeChat?.chatId ?? null}
        className="mx-auto flex w-full md:max-w-[700px] flex-1 flex-col gap-2 overflow-y-auto p-4"
      />
      {activeChat && <div className="mx-auto w-full md:max-w-[700px]">
        <MessageInput chatId={activeChat.chatId} />
      </div>}
    </main>
  );
}
