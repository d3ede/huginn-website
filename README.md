# Huginn

Веб-интерфейс и REST API для hCaptcha: лендинг, аккаунты, API-ключи, очередь задач и биллинг. Движок решения CAPTCHA и платёжный процессинг подключаются как внешние сервисы.

![Главная страница Huginn](docs/screenshots/landing.png)

<details>
<summary>Регистрация</summary>

![Регистрация в Huginn](docs/screenshots/registration.png)

</details>

## Стек и архитектура

- **Frontend:** Next.js 16 / App Router, React 19, TypeScript, Tailwind CSS 4, Recharts. Светлая тема, RU/EN.
- **Backend:** Fastify 5, Zod, PostgreSQL, Prisma 6. Next.js проксирует `/api/*` на Fastify.
- **Задачи:** очередь в PostgreSQL, атомарный захват, таймауты и идемпотентность. Статусы: `queued → processing → succeeded | failed`.
- **Биллинг:** целые микродоллары; резервирование при создании задачи, списание при успехе, однократный возврат при ошибке.
- **Авторизация:** scrypt, сессионные HttpOnly-cookie, API-ключи с хранением SHA-256-хешей. Подтверждение платежей — HMAC-webhook.

Основной код: `app/` — страницы, `components/` — UI, `server/` — API и обработка задач, `prisma/` — схема и миграции. Контракты интеграций: [server/providers.ts](server/providers.ts).

## Запуск

Нужны **Node.js 22.21+** и PostgreSQL. Для разработки доступен встроенный PostgreSQL без Docker.

```powershell
npm ci
Copy-Item .env.example .env
npm run db:generate
npm run db:local
```

Оставьте PostgreSQL запущенным; в другом терминале:

```powershell
npm run db:migrate
npm run dev
```

Frontend: [localhost:3000](http://localhost:3000), API: `127.0.0.1:4000`, локальная БД: `127.0.0.1:54329`. На Linux/macOS используйте `cp .env.example .env`. Для своей БД задайте `DATABASE_URL` и пропустите `db:local`. Адрес frontend должен совпадать с `APP_ORIGIN`.

## REST API

Базовый путь: `/api/v1`. Авторизация: `Authorization: Bearer <API_KEY>`.

| Метод | Путь         | Назначение                                         |
| ----- | ------------ | -------------------------------------------------- |
| GET   | `/balance`   | Баланс в USD                                       |
| POST  | `/tasks`     | Создать задачу: `type`, `websiteURL`, `websiteKey` |
| GET   | `/tasks/:id` | Статус и результат задачи                          |

Поддерживаемый тип — `hcaptcha`; повторные отправки защищены заголовком `Idempotency-Key`. Полный контракт и Python/JavaScript-примеры доступны на `/docs`.

По умолчанию `SOLVER_PROVIDER` и `PAYMENT_PROVIDER` отключены: соответствующие операции возвращают **503**, баланс нового аккаунта — **0**. HTTP-адаптеры настраиваются в [.env.example](.env.example); приватного солвера в репозитории нет.

## Проверки и эксплуатация

```sh
npm test
npm run typecheck
npm run build
npm run test:integration
```

Интеграционные тесты требуют PostgreSQL и создают отдельную временную схему; можно задать `TEST_DATABASE_URL`. Production: `npm run db:migrate`, `npm run build`, `npm start`; HTTPS, реальные секреты и `DEMO_MODE=false` обязательны. `API_INTERNAL_URL` задаётся до сборки.

Подробности провайдеров, webhook, dev-seed и развёртывания: [эксплуатация и интеграции](docs/operations.md). Источники логотипов: [SOURCES.md](public/images/brands/SOURCES.md); промпт фоновой текстуры: [hero-raven-flight-feathers-prompt.txt](docs/hero-raven-flight-feathers-prompt.txt).
