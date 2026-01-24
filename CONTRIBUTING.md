#  Вклад в проект | Contributing

Спасибо за интерес к Notka! Мы рады любому вкладу.
Thank you for your interest in Notka! We welcome all contributions.

---

##  Начало работы | Getting Started

```bash
# Клонировать репозиторий | Clone the repository
git clone https://github.com/Nikitasilin27/notka-web.git
cd notka-web

# Установить зависимости | Install dependencies
nvm use
npm install

# Создать .env файл | Create .env file
cp .env.example .env
# Заполните необходимые переменные | Fill in required variables

# Запустить dev сервер | Start dev server
npm run dev
```

---

##  Перед отправкой PR | Before Submitting PR

Убедитесь, что все проверки проходят:
Make sure all checks pass:

```bash
# Запустить полную проверку | Run full CI check
npm run ci
```

Это включает | This includes:
-  TypeScript проверку типов | Type checking
-  ESLint проверку кода | Code linting
-  Vitest тесты | Tests
-  Production сборку | Production build

---

##  Стиль коммитов | Commit Style

Используем [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Типы | Types

| Тип | Type | Описание | Description |
|-----|------|----------|-------------|
| `feat` | | Новая функция | New feature |
| `fix` | | Исправление бага | Bug fix |
| `docs` | | Документация | Documentation |
| `style` | | Форматирование | Formatting |
| `refactor` | | Рефакторинг | Refactoring |
| `test` | | Тесты | Tests |
| `chore` | | Прочее | Maintenance |

### Примеры | Examples

```bash
feat(auth): add Spotify OAuth PKCE flow
fix(scrobbler): prevent duplicate scrobbles within 5 min window
docs(readme): add bilingual installation guide
test(hooks): add useI18n hook tests
```

---

##  Структура веток | Branch Structure

```
main              # Продакшен | Production
├── develop       # Разработка | Development
├── feature/*     # Новые функции | New features
├── fix/*         # Исправления | Fixes
└── docs/*        # Документация | Documentation
```

---

##  Код стайл | Code Style

### TypeScript
- Строгие типы (no `any`) | Strict types (no `any`)
- Интерфейсы для объектов | Interfaces for objects
- JSDoc для публичных функций | JSDoc for public functions

### React
- Функциональные компоненты | Functional components
- Хуки для состояния | Hooks for state
- Gravity UI компоненты | Gravity UI components

### Комментарии | Comments
- Код комментарии на русском | Code comments in Russian
- Документация билингвальная | Documentation is bilingual

---

##  Тестирование | Testing

```bash
# Запустить тесты | Run tests
npm run test

# Запустить один раз | Run once
npm run test:run

# С покрытием | With coverage
npm run test:coverage
```

Пишите тесты для:
Write tests for:
- Новых хуков | New hooks
- Утилит | Utilities  
- Критичной бизнес-логики | Critical business logic

---

##  Сообщить о баге | Report a Bug

Создайте issue с:
Create an issue with:

1. Описание проблемы | Problem description
2. Шаги воспроизведения | Steps to reproduce
3. Ожидаемое поведение | Expected behavior
4. Скриншоты (если есть) | Screenshots (if any)
5. Окружение (браузер, ОС) | Environment (browser, OS)

---

##  Предложить функцию | Suggest a Feature

Создайте issue с тегом `enhancement`:
Create an issue with `enhancement` tag:

1. Описание функции | Feature description
2. Почему это нужно | Why it's needed
3. Возможная реализация | Possible implementation

---

##  Вопросы | Questions

- Откройте Discussion на GitHub
- Open a Discussion on GitHub

---

<p align="center">
  <strong>Спасибо за вклад! | Thanks for contributing!</strong>
</p>
