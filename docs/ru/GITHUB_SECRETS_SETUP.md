#  Настройка GitHub Secrets

##  Проблема

CI/CD пайплайн падает потому что **GitHub Actions не имеет доступа к переменным окружения** (API ключи Firebase, Spotify). 

Когда код пушится на GitHub, сервер GitHub пытается собрать проект, но у него нет твоего `.env` файла — он не коммитится в репозиторий (и правильно, это секреты!).

---

##  Что нужно сделать

### Шаг 1: Открой настройки репозитория

Перейди сюда:
**https://github.com/Nikitasilin27/notka-web/settings/secrets/actions**

Или: Repository  Settings  Secrets and variables  Actions

---

### Шаг 2: Добавь секреты

Нажми **"New repository secret"** и добавь каждый из этих секретов:

| Название секрета | Откуда взять значение |
|------------------|----------------------|
| `VITE_FIREBASE_API_KEY` | Из твоего `.env` файла |
| `VITE_FIREBASE_AUTH_DOMAIN` | `notka-mvp.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `notka-mvp` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `notka-mvp.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Из `.env` |
| `VITE_FIREBASE_APP_ID` | Из `.env` |
| `VITE_SPOTIFY_CLIENT_ID` | Из `.env` |
| `VITE_SPOTIFY_REDIRECT_URI_PROD` | `https://notka-mvp.web.app/callback` |

---

### Шаг 3: Перезапусти workflow

После добавления секретов:
1. Перейди в **Actions**  выбери упавший workflow
2. Нажми **"Re-run all jobs"**

Или просто сделай любой коммит — workflow запустится автоматически.

---

##  Почему это нужно

```
Твой компьютер (.env файл)     GitHub Actions (нет .env!)
┌─────────────────────────┐    ┌─────────────────────────┐
│ VITE_FIREBASE_API_KEY=  │    │ VITE_FIREBASE_API_KEY=  │
│ AIzaSy...               │    │ ???                     │
│                         │    │                         │
│ npm run build           │    │ npm run build           │
└─────────────────────────┘    └─────────────────────────┘
```

Vite во время сборки заменяет `import.meta.env.VITE_*` на реальные значения. Если значений нет — сборка падает или приложение не работает.

GitHub Secrets — это безопасный способ передать секреты в CI/CD без коммита в код.

---

##  Дополнительно: Topics для поиска

Также добавь topics для лучшей индексации в поиске GitHub:

1. Открой главную страницу репо
2. Нажми  (шестерёнка) рядом с "About"
3. В поле Topics добавь:

```
react, typescript, firebase, spotify, music, scrobbling, vite, gravity-ui, lastfm
```

---

##  Вопросы?

Если что-то не понятно — спроси Крейга, он объяснит!

---

**Создано:** 24 января 2026
**Автор:** Craig (cd4u2b0z)
