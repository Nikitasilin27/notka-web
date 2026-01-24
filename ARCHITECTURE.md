#  Архитектура | Architecture

## Обзор | Overview

**RU:** Notka — это клиентское React-приложение с Firebase в качестве backend-as-a-service. Архитектура делает упор на простоту, обновления в реальном времени и устойчивость при отключении сети.

**EN:** Notka is a client-heavy React application with Firebase as the backend-as-a-service. The architecture prioritizes simplicity, real-time updates, and offline resilience.

---

## Диаграмма системы | System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      БРАУЗЕР ПОЛЬЗОВАТЕЛЯ                        │
│                         USER BROWSER                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   REACT ПРИЛОЖЕНИЕ                         │  │
│  │                   REACT APPLICATION                        │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ Страницы │  │   Хуки   │  │ Сервисы  │  │   Типы   │  │  │
│  │  │  Pages   │  │  Hooks   │  │ Services │  │  Types   │  │  │
│  │  │ ──────── │  │ ──────── │  │ ──────── │  │ ──────── │  │  │
│  │  │ Feed     │  │ useAuth  │  │ firebase │  │ Scrobble │  │  │
│  │  │ Profile  │  │ useI18n  │  │ spotify  │  │ User     │  │  │
│  │  │ Settings │  │ useTheme │  │ wikipedia│  │ Track    │  │  │
│  │  │ Users    │  │useScrobl.│  │          │  │          │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │            GRAVITY UI КОМПОНЕНТЫ                    │   │  │
│  │  │  Button, Card, Modal, Toaster, Theme, Navigation   │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SPOTIFY WEB API                          │
│  • OAuth 2.0 PKCE Flow                                          │
│  • Текущий трек | Currently Playing Track                       │
│  • Профиль пользователя | User Profile                          │
│  • Понравившиеся треки | Liked Tracks                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          FIREBASE                                │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │    FIRESTORE     │  │  CLOUD FUNCTIONS │                     │
│  │  ─────────────── │  │  ─────────────── │                     │
│  │  /users          │  │  onLikeCreated   │                     │
│  │  /scrobbles      │  │  onLikeDeleted   │                     │
│  │  /followers      │  │  onFollowCreated │                     │
│  │  /likes          │  │                  │                     │
│  │  /notifications  │  │                  │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │     HOSTING      │  │  ПРАВИЛА БЕЗОП.  │                     │
│  │  ─────────────── │  │  SECURITY RULES  │                     │
│  │  Статика         │  │  Владение данными│                     │
│  │  SPA роутинг     │  │  Валидация       │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Поток данных | Data Flow

### Процесс скробблинга | Scrobbling Flow

```
1. Пользователь включает трек в Spotify
   User plays track on Spotify
   └─> Spotify обновляет "сейчас играет"

2. Notka опрашивает Spotify API (каждые 10 сек при воспроизведении)
   Notka polls Spotify API (every 10s when playing)
   └─> useScrobbler хук получает текущий трек

3. Прогресс трека отслеживается локально
   Track progress tracked locally
   └─> Когда прослушано 50% ИЛИ 4 минуты (правила Last.fm)

4. Скроббл создаётся в Firestore
   Scrobble created in Firestore
   └─> Коллекция /scrobbles
   └─> Защита от дубликатов (5 мин окно)

5. Real-time подписчики обновляют всех клиентов
   Real-time listeners update all clients
   └─> subscribeToRecentScrobbles()
```

### Процесс лайка | Like Flow

```
1. Пользователь нажимает  на скроббле
   User clicks  on scrobble
   └─> Оптимистичное UI обновление (мгновенно)

2. Документ лайка создаётся
   Like document created
   └─> /likes/{odl}_{scrobbleId}

3. Срабатывает Cloud Function
   Cloud Function triggered
   └─> onLikeCreated
   └─> Увеличивает likesCount на скроббле
   └─> Создаёт уведомление для владельца

4. При ошибке — откат UI
   If error, UI rollback
   └─> Toast сообщение об ошибке
```

---

## Структура директорий | Directory Structure

```
src/
├── components/          # Переиспользуемые UI компоненты
│   │                    # Reusable UI components
│   ├── AppLayout.tsx    # Главный layout с навигацией
│   ├── ErrorBoundary.tsx# Обработчик ошибок React
│   ├── Header.tsx       # Мобильный хедер
│   ├── NowPlaying.tsx   # Виджет "сейчас играет"
│   ├── ScrobbleCard.tsx # Карточка скроббла
│   └── ScrobbleCardSkeleton.tsx
│
├── hooks/               # Кастомные React хуки
│   │                    # Custom React hooks
│   ├── useAuth.tsx      # Состояние авторизации
│   ├── useI18n.tsx      # Интернационализация
│   ├── useOnboarding.ts # Приветствие новых пользователей
│   ├── useScrobbler.ts  # Polling Spotify и скробблинг
│   └── useTheme.tsx     # Тёмная/светлая тема
│
├── pages/               # Компоненты-страницы
│   │                    # Route-level components
│   ├── CallbackPage.tsx # Обработчик OAuth callback
│   ├── FeedPage.tsx     # Главная лента
│   ├── LoginPage.tsx    # Страница входа
│   ├── ProfilePage.tsx  # Профиль пользователя
│   ├── SettingsPage.tsx # Настройки
│   └── UsersPage.tsx    # Поиск пользователей
│
├── services/            # Клиенты внешних API
│   │                    # External API clients
│   ├── firebase.ts      # Операции с Firestore
│   ├── spotify.ts       # Обёртка Spotify API
│   └── wikipedia.ts     # Инфо об артистах
│
├── styles/              # Глобальные стили
│   │                    # Global styles
│   ├── main.scss        # Главный файл стилей
│   ├── theme.css        # Кастомные переопределения темы
│   └── error-boundary.css
│
├── types/               # TypeScript определения
│   │                    # TypeScript definitions
│   └── index.ts         # Все общие типы
│
├── utils/               # Вспомогательные функции
│   │                    # Helper functions
│   ├── monitoring.ts    # Sentry + Web Vitals
│   └── notifications.ts # Toast уведомления
│
├── test/                # Тесты
│   │                    # Tests
│   ├── setup.ts         # Настройка тестового окружения
│   ├── useI18n.test.tsx # Тесты i18n
│   └── useTheme.test.tsx# Тесты темы
│
├── App.tsx              # Корневой компонент с провайдерами
├── main.tsx             # Точка входа
└── firebase.ts          # Инициализация Firebase
```

---

## Ключевые решения | Key Design Decisions

### 1. Клиентский скробблинг | Client-Side Scrobbling
**Почему | Why:** Простота, не нужен бэкенд для основной функции
**Компромисс | Trade-off:** Можно обойти, но приемлемо для социального приложения

### 2. Firestore Real-time
**Почему | Why:** Мгновенные обновления, не нужен polling для ленты
**Компромисс | Trade-off:** Больше reads, но бесплатный tier щедрый

### 3. Gravity UI
**Почему | Why:** Консистентная дизайн-система, встроенная доступность
**Компромисс | Trade-off:** Размер бандла, но хороший tree-shaking

### 4. Нет серверного состояния | No Server-Side State
**Почему | Why:** Firebase управляет всей персистенцией
**Компромисс | Trade-off:** Ограниченные сложные запросы

---

## Модель безопасности | Security Model

```
firestore.rules
├── users/{userId}
│   ├── read: любой | anyone
│   └── write: только владелец | only owner
│
├── scrobbles/{scrobbleId}
│   ├── read: любой | anyone
│   ├── create: авторизованные | authenticated
│   └── delete: только владелец | only owner
│
├── likes/{likeId}
│   ├── read: любой | anyone
│   └── write: только лайкнувший | only liker
│
├── followers/{followId}
│   ├── read: любой | anyone
│   └── write: только участник | only participant
│
└── notifications/{notifId}
    ├── read: только получатель | only recipient
    └── delete: только получатель | only recipient
```

---

## Мониторинг | Monitoring

### Web Vitals
- **LCP** (Largest Contentful Paint) — производительность загрузки
- **FCP** (First Contentful Paint) — начальный рендер
- **CLS** (Cumulative Layout Shift) — визуальная стабильность
- **INP** (Interaction to Next Paint) — интерактивность
- **TTFB** (Time to First Byte) — ответ сервера

### Sentry
- Отслеживание ошибок в продакшене
- Performance monitoring
- Session replay (опционально)

---

## Планы на будущее | Future Considerations

1. **Code Splitting** — Ленивая загрузка страниц
2. **Service Worker** — Оффлайн поддержка, PWA
3. **Redis Cache** — Кэширование горячих данных (при необходимости)
4. **Recommendation Engine** — ML-рекомендации

---

## Участие | Contributing

См. [README.md](README.md) для инструкций по настройке.

Запустите `npm run ci` перед отправкой PR.

Run `npm run ci` before submitting PRs.
