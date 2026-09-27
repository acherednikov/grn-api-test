// // https://green-api.com/v3/docs/api/service/CheckAccount/
export type CheckAccountResponse = {
  exist?: boolean;
  chatId?: string;
  fromCache?: boolean;
  status?: boolean;
  reason?: string;
};

// // https://green-api.com/v3/docs/api/service/GetContactInfo/
export type GetContactInfoResponse = {
  avatar: string;
  name?: string;
  contactName?: string;
  chatType: string;
  chatId: string;
  lastSeen: string | null;
  phoneNumber: number;
  phoneNumberTimestamp: number;
};
