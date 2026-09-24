# Контур — проверка работодателей

Платформа отзывов о работодателях: каталог компаний с гибкими фильтрами, аналитика оценок, отзывы нынешних и бывших сотрудников, обжалование отзывов официальными представителями компаний.

- **Frontend:** React 19 + Vite + TypeScript, CSS Modules, motion, react-router
- **Backend:** Java 21, Spring Boot 3.3, Spring Security (JWT + OAuth 2.0 / OpenID Connect), JPA, Flyway, PostgreSQL, springdoc (Swagger)
- **Дизайн-система:** [`DESIGN.md`](DESIGN.md), аудит: [`docs/DESIGN_AUDIT.md`](docs/DESIGN_AUDIT.md)

## Быстрый старт (Docker)

```bash
cp .env.example .env        # при необходимости поменяйте секреты
docker compose up --build
```

| Что | Адрес |
|-----|-------|
| Сайт | http://localhost:3000 |
| Swagger UI | http://localhost:3000/swagger-ui.html |
| API напрямую | http://localhost:8080/api |

При первом запуске база заполняется демо-данными: 8 компаний, 130 отзывов (`DEMO_DATA=false` отключает).

Демо-аккаунты (пароль `demo12345`):

| Email | Роль |
|-------|------|
| `anna.k@demo.ru` | автор отзывов |
| `ceo@nova.demo` | подтверждённый представитель (CEO) NOVA Studio — может обжаловать отзывы |
| `moderator@demo.ru` | модератор — разбирает заявки через `/api/moderation/**` |

## Локальная разработка

```bash
# фронтенд
npm install
npm run dev                 # http://localhost:5173, /api проксируется на :8080

# бэкенд (нужен PostgreSQL на :5432, например: docker compose up db)
cd backend
mvn spring-boot:run
mvn test                    # unit + интеграционный тест на встроенной H2
```

Если бэкенд не запущен, фронтенд сам переходит в **демо-режим** и работает на тех же данных (`backend/src/main/resources/demo/companies.json`); в шапке появляется метка «Демо-данные».

## Вход через Google (OpenID Connect)

1. Создайте OAuth Client в Google Cloud Console, redirect URI: `http://localhost:3000/login/oauth2/code/google` (для `npm run dev` — `http://localhost:5173/login/oauth2/code/google`).
2. В `.env`: `SPRING_PROFILES_ACTIVE=oauth`, `GOOGLE_CLIENT_ID=…`, `GOOGLE_CLIENT_SECRET=…`.
3. В окне входа появится кнопка «Войти через Google». После входа бэкенд выдаёт собственный JWT и возвращает на `/auth/callback`.

## Основные эндпоинты

| Метод | Путь | Доступ |
|-------|------|--------|
| GET | `/api/companies?q=&country=&city=&minRating=&minClimate=…&sort=RATING_DESC` | публично |
| GET | `/api/companies/{slug}`, `/analytics`, `/reviews` | публично |
| GET | `/api/users/{id}/card` — карточка автора и рейтинг кандидатской активности | публично |
| POST | `/api/companies/{slug}/reviews` | JWT |
| POST | `/api/reviews/{id}/appeals` | JWT, роль REPRESENTATIVE этой компании |
| GET/POST | `/api/moderation/appeals`, `/appeals/{id}/decision` | JWT, роль MODERATOR |
| PUT | `/api/moderation/users/{id}/representative` | JWT, роль MODERATOR |
| POST | `/api/auth/register`, `/api/auth/login`; GET `/api/auth/me` | — |

Полное описание с примерами — в Swagger UI.
