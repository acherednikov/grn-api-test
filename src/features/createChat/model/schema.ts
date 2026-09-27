import { z } from "zod";

export const createChatFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((val) => val === "" || /^\d+$/.test(val), {
      message: "Номер телефона должен содержать только цифры",
    })
    .refine((val) => val === "" || val.length <= 11, {
      message: "Номер телефона должен содержать максимум 11 цифр",
    })
    .refine((val) => val === "" || val.startsWith("7"), {
      message: "Номер телефона должен начинаться с 7",
    }),
});

export type CreateChatFormValues = z.infer<typeof createChatFormSchema>;
