import { useChatStore } from "@/entities/chat";
import { MessageInput } from "@/features/sendMessage";
import { cn } from "@/shared/lib/cn";
import { Button, Avatar } from "@/shared/ui";
import { BackIcon } from "@/shared/ui/icons";

import { MessageList } from "./MessageList";

export function MessagePanel({ className }: { className?: string }) {
  const activeChat = useChatStore((s) => s.getActiveChat());

  const clearActiveChat = useChatStore((s) => s.clearActiveChat);

  return (
    <main
      className={cn(
        "flex min-w-0 flex-1 flex-col pb-3 bg-slate-800 seamless-pattern",
        className,
      )}
    >
      {activeChat && (
        <div className="flex items-center gap-3 bg-dark-bg px-4 py-3 border-b border-slate-700">
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
        className="mx-auto flex flex-1 flex-col w-full min-h-0 gap-2 overflow-y-auto p-4 md:max-w-[700px]"
      />
      {activeChat && <div className="mx-auto w-full shrink-0 md:max-w-[700px]">
        <MessageInput chatId={activeChat.chatId} />
      </div>}
    </main>
  );
}
