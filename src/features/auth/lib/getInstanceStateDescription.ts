import { InstanceState } from "../api/dto";

export type AuthFormValues = {
  idInstance: string;
  apiTokenInstance: string;
};

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
