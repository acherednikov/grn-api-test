import { InstanceState } from "@/shared/api/types";

export type AuthFormValues = {
  idInstance: string;
  apiTokenInstance: string;
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

export function getInstanceStateDescription(state: InstanceState): string {
  switch (state) {
    case InstanceState.NotAuthorized:
      return 'Инстанс не авторизован. Требуется повторная авторизация.';
    
    case InstanceState.Blocked:
      return 'Инстанс заблокирован. Отправка сообщений недоступна. Обратитесь в поддержку для разблокировки.';
    
    case InstanceState.Starting:
      return 'Инстанс в процессе запуска. Это может занять до 5 минут.';
    
    case InstanceState.Suspended:
      return 'На инстансе действуют временные ограничения. Отправка сообщений возможна только на сохранённые контакты.';
    
    case InstanceState.PendingPassword:
      return 'Для завершения авторизации необходимо отправить пароль двухфакторной аутентификации.';
    
    case InstanceState.Authorized:
      return 'Инстанс авторизован и готов к работе.';
    
    default:
      return 'Неизвестное состояние инстанса.';
  }
}
