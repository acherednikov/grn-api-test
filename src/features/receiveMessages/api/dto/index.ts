import { MessageNotificationBody } from "@/shared/api/types";

export type ReceiveNotificationResponse = {
  receiptId: number;
  body: MessageNotificationBody;
} | null;
