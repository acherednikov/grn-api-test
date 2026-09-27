import { MessageNotificationBody } from "@/shared/api/types";

// https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/
export type ReceiveNotificationResponse = {
  receiptId: number;
  body: MessageNotificationBody;
} | null;
