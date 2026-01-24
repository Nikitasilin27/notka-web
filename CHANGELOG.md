#  Журнал изменений | Changelog

Все важные изменения проекта документируются здесь.
All notable changes to this project are documented here.

---

## [0.3.0] — 24 января 2026 | January 24, 2026

###  Инфраструктура качества | Quality Infrastructure

####  Тестирование | Testing
-  Добавлен Vitest + React Testing Library
-  Тесты для хуков useI18n, useTheme
-  Тесты валидации типов
-  Команды: `npm run test`, `npm run test:coverage`

####  Линтинг и форматирование | Linting & Formatting
-  ESLint с правилами TypeScript + React
-  Prettier для единого стиля кода
-  Husky pre-commit хуки с lint-staged
-  Команды: `npm run lint`, `npm run format`

####  TypeScript строгость | TypeScript Strictness
-  `noImplicitAny` — запрет неявных any
-  `strictNullChecks` — явная обработка null/undefined
-  `noImplicitReturns` — все пути должны возвращать значение
-  `noUncheckedIndexedAccess` — безопасный доступ к массивам

###  Мониторинг производительности | Performance Monitoring
-  Интеграция Sentry для отслеживания ошибок
-  Web Vitals (LCP, FCP, CLS, INP, TTFB)
-  Логирование в консоль в режиме разработки
-  Новый файл: `src/utils/monitoring.ts`

###  Сборка и деплой | Build & Deploy
-  Code splitting по вендорам (react, firebase, gravity-ui)
-  GitHub Actions CI/CD пайплайн
-  Авто-деплой на Firebase при мерже в main
-  Пиннинг версии Node (.nvmrc)

###  Документация | Documentation
-  Двуязычный README.md (RU/EN)
-  ARCHITECTURE.md с диаграммами
-  Полные SEO мета-теги и Open Graph
-  robots.txt

###  Новые зависимости | New Dependencies
```
@sentry/react — мониторинг ошибок | error monitoring
web-vitals — метрики производительности | performance metrics
vitest — тестирование | testing
@testing-library/react — тесты React компонентов | React component tests
eslint + prettier — качество кода | code quality
husky + lint-staged — pre-commit хуки | pre-commit hooks
```

---

## [0.2.0] — 23 января 2026 | January 23, 2026

###  UI/UX Улучшения | UI/UX Improvements

####  Анимации и переходы | Animations & Transitions
- Плавная анимация появления карточек скробблов (`slideInUp`)
- Анимация "сердцебиение" при нажатии на кнопку лайка (`heartbeat`)
- Эффект поднятия карточки при наведении с тенью
- Анимации для диалогов, тостов и уведомлений

####  Now Playing (Сейчас играет)
- Анимированный индикатор воспроизведения (4 полоски эквалайзера)
- Улучшенное отображение пустого состояния
- Плейсхолдер для отсутствующей обложки

####  Скелетоны загрузки | Loading Skeletons
- Shimmer-эффект для скелетонов
- Оптимистичные UI обновления для лайков

###  Доступность | Accessibility
- Стили `:focus-visible` для всех кнопок и ссылок
- `prefers-reduced-motion` — отключение анимаций
- `prefers-contrast` — режим высокой контрастности
- Skip-link для screen readers

###  Уведомления | Notifications
- Gravity UI Toaster вместо react-hot-toast
- Toast уведомления об успехе/ошибке
- Onboarding приветствие для новых пользователей

---

## [0.1.0] — декабрь 2025 | December 2025

###  Начальный релиз MVP | Initial MVP Release

####  Авторизация | Authentication
- OAuth 2.0 через Spotify (PKCE flow)
- Автоматическое создание профиля в Firebase

####  Скробблинг | Scrobbling
- Автоматический скробблинг по правилам Last.fm
- 50% трека ИЛИ 4 минуты (что раньше)
- Защита от дубликатов (5 минут окно)

####  Социальные функции | Social Features
- Подписки (follow/unfollow)
- Лайки скробблов
- Real-time уведомления
- Music Match — совместимость вкусов

####  Профиль | Profile
- Топ артистов и альбомов
- История прослушиваний
- Понравившиеся треки

####  Интерфейс | Interface
- Адаптивный дизайн (мобильный + десктоп)
- Тёмная/светлая тема
- Двуязычность (RU/EN)

---

##  План | Roadmap

### Следующие шаги | Next Steps
- [ ] Пагинация ленты (infinite scroll)
- [ ] Кэширование Spotify API (React Query)
- [ ] Комментарии к скробблам
- [ ] Year in Review (как Spotify Wrapped)
- [ ] PWA поддержка

---

**Автор | Author:** Notka Team  
**Версия формата | Format version:** [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/)
