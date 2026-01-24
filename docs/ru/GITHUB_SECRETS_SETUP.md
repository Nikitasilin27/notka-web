#  Настройка GitHub Secrets

##  Проблема

CI/CD пайплайн падает потому что **GitHub Actions не имеет доступа к переменным окружения** (API ключи Firebase, Spotify) и **Firebase Service Account** для деплоя.

Когда код пушится на GitHub, сервер GitHub пытает собрать и задеплоить проект, но у него нет:
1. Твоего `.env` файла — он не коммитится (и правильно, это секреты!)
2. Firebase Service Account ключа для авторизации деплоя

---

##  Что нужно сделать

### Шаг 1: Открой настройки репозитория

Перейди сюда:
**https://github.com/Nikitasilin27/notka-web/settings/secrets/actions**

Или: Repository  Settings  Secrets and variables  Actions

---

### Шаг 2: Добавь Firebase Service Account (ОБЯЗАТЕЛЬНО!)

Это **самый важный** секрет — без него деплой не работает!

**Название секрета:** `FIREBASE_SERVICE_ACCOUNT_NOTKA_MVP`

**Как получить значение:**

1. Открой [Firebase Console](https://console.firebase.google.com/)
2. Выбери проект **notka-mvp**
3. Перейди: Project Settings (шестерёнка)  Service accounts
4. Нажми **"Generate new private key"**
5. Скачается JSON файл — **скопируй ВЕСЬ его контент**
6. Вставь в поле Value секрета на GitHub

> Важно: Вставь весь JSON как есть, включая фигурные скобки `{ ... }`

---

### Шаг 3: Добавь остальные секреты

Нажми **"New repository secret"** и добавь каждый:

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

### Шаг 4: Перезапусти workflow

После добавления секретов:
1. Перейди в **Actions**  выбери упавший workflow
2. Нажми **"Re-run all jobs"**

Или просто сделай любой коммит — workflow запустится автоматически.

---

##  Почему это нужно

```
Твой компьютер                  GitHub Actions
┌─────────────────────────┐    ┌─────────────────────────┐
│  .env файл с секретами │    │  GitHub Secrets        │
│  Firebase CLI авториз. │    │  Service Account JSON  │
│                         │    │                         │
│ npm run build + deploy  │    │ npm run build + deploy  │
└─────────────────────────┘    └─────────────────────────┘
```

- **VITE_*** секреты — нужны для **сборки** (Vite заменяет `import.meta.env.*` на реальные значения)
- **FIREBASE_SERVICE_ACCOUNT_*** — нужен для **деплоя** (авторизация в Firebase Hosting)

GitHub Secrets — это безопасный способ передать секреты в CI/CD без коммита в код.

---

##  Чеклист

- [ ] `FIREBASE_SERVICE_ACCOUNT_NOTKA_MVP` — **самый важный!**
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_SPOTIFY_CLIENT_ID`
- [ ] `VITE_SPOTIFY_REDIRECT_URI_PROD`

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
