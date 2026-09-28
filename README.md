# GREEN-API Chat MAX&#x20;

React + Vite + TypeScript, архитектура FSD light.

🔗 **Live Demo:** [grn-api-test.vercel.app](https://grn-api-test.vercel.app/)

## Запуск

Клонировать репозиторий (пример для SSH):

```bash
git clone git@github.com:acherednikov/grn-api-test.git
```

Установить зависимости и запустить приложение:

```bash
npm install
npm run dev
```

## Конфигурация

Для изменения параметров приложения создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Доступные переменные окружения:

- `VITE_GREEN_API_URL` — базовый URL GREEN-API (по умолчанию: `https://api.green-api.com`)
- `VITE_POLL_INTERVAL_MS` — интервал опроса уведомлений в мс (по умолчанию: `8000`)
- `VITE_MAX_MESSAGE_LENGTH` — максимальная длина сообщения (по умолчанию: `4000`)

После изменения `.env` перезапустите dev-сервер.

## Тестирование

Для запуска тестов используется Vitest:

```bash
npm test          # Запуск тестов в watch-режиме
npm run test:ui   # Запуск тестов с UI-интерфейсом
```

## Структура `src/`

- `app/` — провайдеры, роутинг, глобальные стили
- `pages/` — экраны Auth и Chat
- `widgets/` — ChatSidebar, MessagePanel
- `features/` — auth, createChat, sendMessage, receiveMessages
- `entities/` — session, chat, message
- `shared/` — GREEN-API client, UI-kit, утилиты

В dev запросы к GREEN-API проксируются через `/api/green` (см. `vite.config.ts`).

## Используемые библиотеки

### Основные зависимости
- **React 19**
- **TypeScript 5.7**
- **Vite 6**
  **React Router DOM 7**

### Управление состоянием
- **Zustand 5**
- **TanStack Query 5**

### Формы и валидация
- **React Hook Form 7**
- **Zod 4**
- **@hookform/resolvers**

### Стилизация
- **Tailwind CSS 4**
