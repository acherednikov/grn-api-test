export type AuthFormValues = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl?: string;
};

export type AuthFormErrors = Partial<Record<keyof AuthFormValues, string>>;

export function validateCredentials(
  values: AuthFormValues,
): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (!values.idInstance.trim()) {
    errors.idInstance = "Укажите idInstance";
  }
  if (!values.apiTokenInstance.trim()) {
    errors.apiTokenInstance = "Укажите apiTokenInstance";
  }

  return errors;
}
