#  Notka Web - План Улучшений MVP → Minimal Lovable Product

**Дата анализа:** 31 декабря 2025
**Текущая версия:** 0.1.0 (MVP)
**Ветка разработки:** `claude/project-review-plan-Wwhez`

---

##  Текущее Состояние Проекта

### Технологический Стек
- **Frontend:** React 18.3.1 + TypeScript + Vite
- **UI Kit:** Gravity UI (Yandex)
- **Backend:** Firebase (Firestore + Cloud Functions + Auth + Hosting)
- **Интеграции:** Spotify Web API, Wikipedia API
- **Размер кода:** 22 исходных файла TypeScript/TSX

### Реализованные Фичи (MVP)
 OAuth авторизация через Spotify (PKCE)
 Автоматический скробблинг треков (Last.fm rules)
 Лента активности (все/подписки/мои треки)
 Социальные функции (follow/unfollow, likes)
 Уведомления (real-time с Firestore)
 Статистика профиля (топ артисты/альбомы)
 Music Match - анализ совместимости вкусов
 Адаптивный дизайн (мобильная + десктоп версии)
 Интернационализация (RU/EN)
 Темная/светлая тема
 Синхронизация лайков Spotify ↔ Notka

---

##  Критические Проблемы (Приоритет 1)

### 1. БЕЗОПАСНОСТЬ - Firestore Rules  КРИТИЧНО
**Проблема:** Все данные открыты для чтения и записи
```javascript
// firestore.rules - ТЕКУЩЕЕ СОСТОЯНИЕ
allow read, write: if true; //  Любой может читать/изменять ВСЁ
```

**Риски:**
- Любой может удалить чужие скробблы
- Доступ к личным данным пользователей
- Спам, манипуляция лайками/подписками
- Нарушение GDPR/конфиденциальности

**Решение:** Реализовать защищенные правила доступа

---

### 2. ОТСУТСТВИЕ ТЕСТОВ
**Проблема:** 0 unit/integration тестов найдено

**Риски:**
- Регрессии при рефакторинге
- Ошибки в critical path (авторизация, скробблинг)
- Сложность онбординга новых разработчиков

**Охват тестами:** 0%

---

### 3. ОБРАБОТКА ОШИБОК
**Проблема:** Минимальная обработка ошибок

**Примеры:**
- Нет fallback при сбое Spotify API
- Отсутствует retry logic для сетевых запросов
- Ошибки только в консоли, пользователь не видит

**Решение:** Централизованная система обработки ошибок с UI-feedback

---

### 4. УПРАВЛЕНИЕ КОНФИГУРАЦИЕЙ
**Проблема:** Отсутствие .env файлов

**Текущее:** Hardcoded значения в коде
- Spotify Client ID
- Firebase config
- API endpoints

**Риски:**
- Невозможность разделить dev/staging/prod
- Секреты в репозитории

---

##  Области для Улучшения (Приоритет 2)

### 5. ПРОИЗВОДИТЕЛЬНОСТЬ

**Проблемы:**
- Нет кэширования Spotify API запросов
- Загрузка 500 скробблов для фильтрации на клиенте
- Отсутствие пагинации в ленте
- Polling каждые 5 секунд (можно увеличить до 10-15)

**Метрики для улучшения:**
- Время загрузки ленты: ?ms (нужно замерить)
- Размер bundle: ?kb (нужен анализ)

---

### 6. UX/UI УЛУЧШЕНИЯ

**Отсутствует:**
-  Loading states (скелетоны)
-  Оптимистичные UI обновления
-  Toast уведомления об успехе/ошибке
-  Пустые состояния с CTA
-  Onboarding для новых пользователей
-  Search/Filter в профиле (частично есть)
-  Infinite scroll в ленте

**Текущие UX проблемы:**
- При лайке нет визуальной обратной связи до загрузки
- Нет индикации синхронизации со Spotify
- Непонятно, когда произойдет скробблинг

---

### 7. МОНИТОРИНГ И АНАЛИТИКА

**Отсутствует:**
- Логирование ошибок (Sentry)
- Аналитика использования (Google Analytics / Mixpanel)
- Performance monitoring
- User feedback механизм

---

### 8. SEO И МЕТАДАННЫЕ

**Проблемы:**
- Отсутствие meta tags (og:image, description)
- Нет robots.txt
- Отсутствует sitemap
- Пустой title для страниц

---

### 9. ДОСТУПНОСТЬ (A11Y)

**Не реализовано:**
- ARIA labels
- Keyboard navigation
- Screen reader support
- Контрастность цветов (нужна проверка)

---

### 10. ДОКУМЕНТАЦИЯ

**Отсутствует:**
- README с инструкциями по запуску
- API документация
- Архитектурные диаграммы
- Contributing guidelines

---

##  План Работ: MVP → Minimal Lovable Product

### Фаза 1: Критические Исправления (2-3 дня разработки)

#### 1.1 Безопасность Firebase
- [ ] Написать Firestore Security Rules
  - Users: read: all, write: только owner
  - Scrobbles: read: all, write: только owner, delete: только owner
  - Likes: read: all, write: только владелец лайка
  - Followers: CRUD только для участников связи
  - Notifications: read/delete: только получатель
- [ ] Добавить валидацию данных в rules
- [ ] Тестировать rules с Firebase Emulator

#### 1.2 Environment Configuration
- [ ] Создать `.env.example` с шаблоном
- [ ] Переместить Firebase config в переменные окружения
- [ ] Переместить Spotify Client ID в .env
- [ ] Настроить разные окружения (dev/prod)

#### 1.3 Обработка Ошибок
- [ ] Создать `ErrorBoundary` компонент
- [ ] Добавить toast-уведомления (react-hot-toast)
- [ ] Централизовать error handling в API сервисах
- [ ] Добавить retry logic для Spotify API

---

### Фаза 2: Качество и Стабильность (3-4 дня)

#### 2.1 Тестирование
- [ ] Настроить Vitest + React Testing Library
- [ ] Unit тесты для hooks (useAuth, useScrobbler)
- [ ] Unit тесты для сервисов (firebase, spotify)
- [ ] Integration тесты для критических flows
- [ ] E2E тесты для авторизации и скробблинга (Playwright)
- [ ] Покрытие кода минимум 60%

#### 2.2 TypeScript Строгость
- [ ] Включить `strict: true` в tsconfig
- [ ] Исправить все `any` типы
- [ ] Добавить JSDoc комментарии для публичных функций

#### 2.3 Code Quality
- [ ] Настроить ESLint + Prettier
- [ ] Добавить pre-commit hooks (husky + lint-staged)
- [ ] Провести code review и рефакторинг дублирующегося кода

---

### Фаза 3: UX Улучшения (3-4 дня)

#### 3.1 Loading States
- [ ] Skeleton loaders для ScrobbleCard
- [ ] Shimmer effect для загрузки
- [ ] Progress bar для долгих операций

#### 3.2 Оптимистичные UI
- [ ] Мгновенные лайки (без ожидания Firebase)
- [ ] Оптимистичный follow/unfollow
- [ ] Rollback при ошибке

#### 3.3 Toast Notifications
- [ ] Уведомления об успехе (лайк, подписка)
- [ ] Уведомления об ошибках
- [ ] Уведомления о синхронизации со Spotify

#### 3.4 Onboarding
- [ ] Welcome screen для новых пользователей
- [ ] Tooltips для основных функций
- [ ] Empty states с призывами к действию

#### 3.5 Улучшенная навигация
- [ ] Breadcrumbs для профилей
- [ ] "Назад" кнопка на мобильной версии
- [ ] Keyboard shortcuts (j/k для навигации, l для лайка)

---

### Фаза 4: Производительность (2-3 дня)

#### 4.1 Оптимизация Запросов
- [ ] Реализовать пагинацию в ленте (cursor-based)
- [ ] Infinite scroll вместо загрузки всех скробблов
- [ ] Кэширование Spotify API (React Query)
- [ ] Debounce для поиска

#### 4.2 Bundle Optimization
- [ ] Code splitting по роутам
- [ ] Lazy loading компонентов
- [ ] Tree shaking для неиспользуемого кода
- [ ] Анализ bundle size (vite-bundle-visualizer)

#### 4.3 Image Optimization
- [ ] Lazy loading для обложек альбомов
- [ ] Responsive images (srcset)
- [ ] Placeholder blur для изображений

---

### Фаза 5: Фичи для "Lovable" (4-5 дней)

#### 5.1 Улучшенная Статистика
- [ ] Графики прослушивания (Chart.js / Recharts)
- [ ] "Listening clock" - когда слушаешь музыку
- [ ] Streak counter (дни подряд скробблинга)
- [ ] Year in Review (как Spotify Wrapped)

#### 5.2 Социальные Фичи
- [ ] Комментарии к скробблам
- [ ] Репосты треков
- [ ] Плейлисты из скробблов
- [ ] "Сейчас слушают друзья" виджет

#### 5.3 Рекомендации
- [ ] "Вам может понравиться" на основе скробблов
- [ ] "Слушают похожие пользователи"
- [ ] Ежедневный дайджест новинок от подписок

#### 5.4 Геймификация
- [ ] Бейджи/достижения (100 скробблов, 10 подписчиков)
- [ ] Leaderboard активных слушателей
- [ ] Челленджи (прослушай 5 новых артистов)

---

### Фаза 6: Полировка и Запуск (2-3 дня)

#### 6.1 SEO
- [ ] Meta tags для всех страниц
- [ ] Open Graph для шаринга
- [ ] Structured data (JSON-LD)
- [ ] Sitemap.xml
- [ ] Robots.txt

#### 6.2 Доступность
- [ ] ARIA labels для всех интерактивных элементов
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] WCAG 2.1 AA compliance

#### 6.3 Мониторинг
- [ ] Интеграция Sentry для error tracking
- [ ] Google Analytics / Plausible
- [ ] Firebase Performance Monitoring
- [ ] Uptime monitoring (UptimeRobot)

#### 6.4 Документация
- [ ] README с quick start
- [ ] CONTRIBUTING.md
- [ ] API документация
- [ ] Архитектурная диаграмма

---

##  Рекомендуемые Библиотеки

### Обязательные
- `vitest` + `@testing-library/react` - тестирование
- `react-hot-toast` - toast уведомления
- `@tanstack/react-query` - кэширование API
- `react-error-boundary` - обработка ошибок
- `zod` - валидация данных

### Для UX
- `framer-motion` - анимации
- `react-intersection-observer` - lazy loading
- `react-virtual` - виртуализация списков
- `react-use` - полезные hooks

### Для Статистики/Графиков
- `recharts` или `chart.js` - графики
- `date-fns` - работа с датами

### Dev Tools
- `eslint` + `prettier` - форматирование
- `husky` + `lint-staged` - pre-commit hooks
- `vite-bundle-visualizer` - анализ bundle

---

##  UI/UX Приоритеты для "Lovable"

### Эмоциональное Вовлечение
1. **Микроанимации** - плавные переходы, жесты
2. **Персонализация** - аватары, баннеры профиля, темы
3. **Feedback** - "сердечки", конфетти при достижениях
4. **Storytelling** - "Ваша музыкальная история"

### Удобство
1. **Нулевые состояния** - полезные подсказки вместо пустых экранов
2. **Быстрый доступ** - shortcuts, QuickActions
3. **Умные дефолты** - автоподписки на активных пользователей
4. **Undo/Redo** - откат действий

### Социальность
1. **Профили как визитки** - красивые, информативные
2. **Activity feed** - вовлекающий, персонализированный
3. **Notifications** - актуальные, не спамные
4. **Discovery** - легко найти интересных людей

---

##  Метрики Успеха

### Технические (MVP → MLP)
-  Firestore Rules: 0% → 100% защищено
-  Test Coverage: 0% → 60%+
-  Bundle Size: ?kb → <500kb
-  Lighthouse Score: ? → 90+
-  First Contentful Paint: ?ms → <1.5s

### Продуктовые
-  Time to First Scrobble: <2 минуты
-  DAU/MAU Ratio: >20% (engagement)
-  Churn Rate: <30% (first week)
-  NPS Score: >40

---

##  Приоритизация (MoSCoW)

### Must Have (Фаза 1-2)
-  Firestore Security Rules
-  Environment config
-  Error handling
-  Basic tests

### Should Have (Фаза 3-4)
-  Loading states
-  Toast notifications
-  Performance optimization
-  Code quality tools

### Could Have (Фаза 5)
-  Advanced stats
-  Gamification
-  Social features

### Won't Have (для v2.0)
-  Mobile app (пока PWA)
-  Audio playback integration
-  Paid subscriptions
-  AI-powered recommendations

---

##  Следующие Шаги

### Немедленно (сегодня)
1.  Создать ветку для разработки
2. ⬜ Настроить Firestore Security Rules
3. ⬜ Добавить .env конфигурацию

### На этой неделе
1. ⬜ Реализовать обработку ошибок
2. ⬜ Настроить тестирование
3. ⬜ Добавить toast уведомления

### В течение месяца
1. ⬜ Завершить Фазы 1-3
2. ⬜ Провести internal beta testing
3. ⬜ Собрать первый user feedback

---

##  Идеи для Дифференциации

### Уникальные Фичи
1. **Music DNA** - визуальный "отпечаток" музыкального вкуса
2. **Listening Parties** - синхронное прослушивание с друзьями
3. **Vinyl Mode** - ретро-дизайн с эффектом пластинки
4. **Time Machine** - "что я слушал год назад"
5. **Mood Tracking** - связь музыки с настроением

---

##  Техническая Архитектура (будущее)

### Микросервисы
- Scrobbling Service (Cloud Function)
- Recommendation Engine (Python + ML)
- Notification Service (Firebase)

### Кэширование
- Redis для частых запросов
- CDN для статики

### Масштабирование
- Sharding Firestore по регионам
- Rate limiting для API

---

**Автор плана:** Claude
**Версия:** 1.0
**Последнее обновление:** 31.12.2025
