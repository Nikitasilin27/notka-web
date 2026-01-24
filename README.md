<div align="center">

#  Notka

<img src="public/music-illustration.png" alt="Notka" width="180">

**Социальный скробблинг музыки — делись тем, что слушаешь**
**Social music scrobbling — share what you're listening to**

[![CI](https://github.com/Nikitasilin27/notka-web/actions/workflows/ci.yml/badge.svg)](https://github.com/Nikitasilin27/notka-web/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[О проекте](#-о-проекте--about) •
[Возможности](#-возможности--features) •
[Быстрый старт](#-быстрый-старт--quick-start) •
[Команды](#-команды--scripts) •
[Архитектура](#-архитектура--architecture) •
[Документация](#-документация--documentation)

</div>

---

##  О проекте | About

<table>
<tr>
<td width="50%">

### Русский

Notka — это социальное приложение для отслеживания музыки. Автоматически записывает (скробблит) то, что вы слушаете в Spotify.

Находите людей со схожим вкусом, смотрите что слушают друзья, открывайте новую музыку через реальные рекомендации от живых людей.

**Как Last.fm, но современный, социальный и живой.**

</td>
<td width="50%">

### English

Notka is a social music tracking app that automatically scrobbles what you're listening to on Spotify.

Find people with similar taste, see what your friends are playing, and discover new music through real human recommendations.

**Think Last.fm, but modern, social, and alive.**

</td>
</tr>
</table>

###  Философия | Philosophy

> **RU:** Мы верим, что музыкой лучше делиться. Не через алгоритмы, а через людей, чьему вкусу вы доверяете.
>
> **EN:** We believe music is better shared. Not algorithmically pushed, but genuinely discovered through people whose taste you trust.

---

##  Возможности | Features

<table>
<tr>
<td>

|  | Функция | Feature |
|:--:|---------|---------|
|  | Автоскробблинг | Auto-scrobbling |
|  | Лента друзей | Social feed |
|  | Лайки треков | Track likes |
|  | Статистика | Statistics |

</td>
<td>

|  | Функция | Feature |
|:--:|---------|---------|
|  | Уведомления | Notifications |
|  | Тёмная/светлая тема | Dark/Light theme |
|  | Двуязычность | Bilingual RU/EN |
|  | Music Match | Taste compatibility |

</td>
</tr>
</table>

---

##  Быстрый старт | Quick Start

```bash
# Клонировать репозиторий | Clone repository
git clone https://github.com/Nikitasilin27/notka-web.git
cd notka-web

# Использовать нужную версию Node | Use correct Node version
nvm use

# Установить зависимости | Install dependencies
npm install

# Настроить окружение | Configure environment
cp .env.example .env
# Отредактируйте .env | Edit .env with your credentials

# Запустить сервер разработки | Start dev server
npm run dev
```

 Откройте | Open: **http://127.0.0.1:5173**

---

##  Команды | Scripts

<table>
<tr>
<th>Команда | Command</th>
<th>Описание | Description</th>
</tr>
<tr><td><code>npm run dev</code></td><td> Сервер разработки | Development server</td></tr>
<tr><td><code>npm run build</code></td><td> Сборка продакшена | Production build</td></tr>
<tr><td><code>npm run test</code></td><td> Запуск тестов | Run tests</td></tr>
<tr><td><code>npm run test:coverage</code></td><td> Тесты с покрытием | Tests with coverage</td></tr>
<tr><td><code>npm run lint</code></td><td> Проверка кода | Code linting</td></tr>
<tr><td><code>npm run format</code></td><td> Форматирование | Code formatting</td></tr>
<tr><td><code>npm run typecheck</code></td><td> Проверка типов | Type checking</td></tr>
<tr><td><code>npm run ci</code></td><td> Полный CI пайплайн | Full CI pipeline</td></tr>
</table>

---

##  Архитектура | Architecture

###  Стек технологий | Tech Stack

| Слой | Layer | Технология | Technology |
|------|-------|------------|------------|
| **Frontend** | | React 18 + TypeScript + Vite | |
| **UI Kit** | | [Gravity UI](https://gravity-ui.com/) (Yandex) | |
| **Backend** | | Firebase (Firestore, Auth, Functions) | |
| **Hosting** | | Firebase Hosting | |
| **API** | | Spotify Web API, Wikipedia API | |

###  Структура проекта | Project Structure

```
src/
├──  components/    # UI компоненты | UI components
├──  hooks/         # React хуки | Custom hooks  
├──  pages/         # Страницы | Route pages
├──  services/      # API клиенты | API clients
├──  styles/        # Стили | Styles (SCSS)
├──  types/         # TypeScript типы | Type definitions
├──  utils/         # Утилиты | Helpers
└──  test/          # Тесты | Tests
```

 Подробнее: [ARCHITECTURE.md](ARCHITECTURE.md)

---

##  Переменные окружения | Environment Variables

Скопируйте `.env.example` в `.env` и заполните:
Copy `.env.example` to `.env` and fill in:

```env
#  Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id

#  Spotify
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI_PROD=https://your-domain.web.app/callback
VITE_SPOTIFY_REDIRECT_URI_DEV=http://127.0.0.1:5173/callback

#  Мониторинг | Monitoring (optional)
VITE_SENTRY_DSN=your_sentry_dsn
```

---

##  Качество кода | Code Quality

| Инструмент | Tool | Назначение | Purpose |
|------------|------|------------|---------|
| **TypeScript** |  | Строгая типизация | Strict typing |
| **ESLint** |  | Анализ кода | Code analysis |
| **Prettier** |  | Форматирование | Formatting |
| **Vitest** |  | Тестирование | Unit testing |
| **Husky** |  | Pre-commit хуки | Pre-commit hooks |
| **Sentry** |  | Мониторинг ошибок | Error monitoring |
| **Web Vitals** |  | Метрики производительности | Performance metrics |

---

##  Деплой | Deployment

```bash
# Сборка | Build
npm run build

# Деплой на Firebase | Deploy to Firebase
firebase deploy
```

Или используйте **GitHub Actions** — автоматический деплой при мерже в `main`.

---

##  Документация | Documentation

| Файл | File | Описание | Description |
|------|------|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) |  | Архитектура и диаграммы | Architecture & diagrams |
| [CHANGELOG.md](CHANGELOG.md) |  | История изменений | Version history |
| [CONTRIBUTING.md](CONTRIBUTING.md) |  | Руководство для контрибьюторов | Contributing guide |
| [docs/ru/](docs/ru/) |  | Внутренняя документация разработки | Internal dev docs |

---

##  Вклад | Contributing

<table>
<tr>
<td width="50%">

### Русский

1. Форкните репозиторий
2. Создайте ветку (`git checkout -b feature/amazing`)
3. Закоммитьте изменения
4. Запустите `npm run ci`
5. Создайте Pull Request

</td>
<td width="50%">

### English

1. Fork the repository
2. Create a branch (`git checkout -b feature/amazing`)
3. Commit your changes
4. Run `npm run ci`
5. Create a Pull Request

</td>
</tr>
</table>

 Подробнее: [CONTRIBUTING.md](CONTRIBUTING.md)

---

##  Лицензия | License

[MIT](LICENSE) © Notka Team

---

<div align="center">

**Сделано с  для любителей музыки**
**Made with  for music lovers**

[](#-notka)

</div>
