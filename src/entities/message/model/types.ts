export type MessageDirection = "incoming" | "outgoing";

export enum MessageStatus {
  Pending = "pending",
  Sent = "sent",
  Failed = "failed",
}

export type Message = {
  id: string;
  chatId: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
  idMessage?: string;
  status?: MessageStatus;
};
