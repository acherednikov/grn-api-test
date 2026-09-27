import { z } from "zod";

export const authFormSchema = z.object({
  idInstance: z
    .string()
    .trim()
    .min(1, "Укажите idInstance")
    .regex(/^\d+$/, "idInstance должен содержать только цифры"),
  apiTokenInstance: z
    .string()
    .trim()
    .min(1, "Укажите apiTokenInstance")
});

export type AuthFormValues = z.infer<typeof authFormSchema>;
