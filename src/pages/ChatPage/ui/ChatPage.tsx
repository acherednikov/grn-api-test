import { useNavigate } from "react-router-dom";

import { useChatStore } from "@/entities/chat";
import { useSessionStore } from "@/entities/session";
import { ChatSidebar } from "@/widgets/ChatSidebar";
import { MessagePanel } from "@/widgets/MessagePanel";
import { useMessagePolling } from "@/features/receiveMessages";
import { Button } from "@/shared/ui";

export function ChatPage() {
  const navigate = useNavigate();
  const clearSession = useSessionStore((s) => s.clearSession);
  const hasActiveChat = useChatStore((s) => s.activeChatId !== null);

  useMessagePolling(true);

  const onLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-dvh flex-col">
      <nav className="flex items-center justify-between bg-dark-bg px-4 py-2 border-b border-gray-700">
        <span className="text-sm font-semibold text-white">GREEN-API Chat</span>
        <Button variant="ghost" onClick={onLogout}>
          Выйти
        </Button>
      </nav>
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
