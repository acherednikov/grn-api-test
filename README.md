# GREEN-API Chat MAX&#x20;

React + Vite + TypeScript, архитектура FSD light.

🔗 **Live Demo:** [grn-api-test.vercel.app](https://grn-api-test.vercel.app/)

## Запуск

```bash
npm install
npm run dev
```

## Конфигурация

Для настройки параметров приложения создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Доступные переменные окружения:

После изменения `.env` перезапустите dev-сервер.

## Тестирование

Для запуска тестов используется Vitest:

```bash
npm test          # Запуск тестов в watch-режиме
npm run test:ui   # Запуск тестов с UI-интерфейсом
```

<br />

# Структура `src/`

В dev запросы к GREEN-API проксируются через `/api/green` (см. `vite.config.ts`).

## Используемые библиотеки

### Основные зависимости

### Управление состоянием

### Формы и валидация

### Стилизация
