import { useChatStore } from "@/entities/chat/model/chatStore";
import { ChatSidebar } from "@/widgets/ChatSidebar/ui/ChatSidebar";
import { MessagePanel } from "@/widgets/MessagePanel/ui/MessagePanel";
import { useMessagePolling } from "@/features/receiveMessages/model/useMessagePolling";

export function ChatPage() {
  const hasActiveChat = useChatStore((s) => s.activeChatId !== null);

  useMessagePolling(true);

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex min-h-0 flex-1">
        <ChatSidebar
          className={`flex-1 basis-0 lg:min-w-[320px] lg:max-w-sm lg:basis-auto ${
            hasActiveChat ? "hidden" : "flex"
          } lg:flex`}
        />
        <MessagePanel
          className={`flex-1 basis-0 ${
            hasActiveChat ? "flex" : "hidden"
          } lg:flex`}
        />
      </div>
    </div>
  );
}
