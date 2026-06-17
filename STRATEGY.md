# Notka — Стратегия развития (PWA-first)

**Дата:** 2026-06-17
**Видение:** «Тиндер для меломанов» — находить людей по совпадению музыкального вкуса, «рядом» как фильтр поверх.
**Решение по платформе:** Веб как **PWA** — главный клиент. Нативный iOS — компаньон позже.

---

## 0. Принцип, на котором держится всё: лестница ценности

«Совпадения рядом» работает только при локальной плотности, которой на старте **не будет**. Пустая карта = ушедший навсегда первый юзер. Поэтому ценность строим слоями, и **гео — последний слой, а не входной билет**:

| Слой | Что даёт пользователю | Работает при | Статус |
|---|---|---|---|
| **Соло (N=1)** | Авто-скробблинг, своя статистика, лента | уже сейчас | ✅ есть |
| **Глобальный матч** | «Музыкальные соулмейты» по совпадению вкуса | сотни юзеров, без гео | 🔨 строим |
| **Рядом (фильтр)** | Карта/список «люди в твоём городе/районе» | локальная плотность | 🔨 строим поверх |
| **Связь** | Взаимный мэтч → чат → обмен треками | везде | 🔨 строим |

**Правило:** матчинг запускаем глобально, «рядом» — фильтр. Карта оживает «по мере наполнения», но никогда не блокирует вход.

---

## 1. Почему PWA

**Плюсы:** один кодбейс на все платформы, установка на домашний экран, геолокация, деплой в Firebase Hosting за минуту, **без $99/год и ревью App Store**, мгновенные обновления.

**Ограничения, которые надо принять:**
- **Web Push на iOS** работает только для установленной с домашнего экрана PWA (iOS 16.4+) и менее надёжен, чем APNs. → Для критичных уведомлений (новый мэтч, сообщение) на iOS это слабое место; здесь позже выручит нативный клиент.
- Фоновый скробблинг в браузере невозможен — скробблим только пока вкладка/PWA активна. → Нативный iOS позже закроет фоновый скробблинг.

**Вывод:** PWA закрывает 90% пути к живому продукту. Нативный iOS добавляем там, где PWA объективно слабее (фон + push).

---

## 2. Развязать backend: единый ID (делать первым)

**Проблема:** веб ключует юзеров по Spotify ID (`odl`), iOS — по Firebase Auth UID. Документы не делятся.

**Решение — канонический ключ = Firebase Auth UID:**
- Вход: Spotify OAuth (PKCE) → Cloud Function мостит в Firebase Auth через **custom token** (под это уже есть `signInToFirebase(customToken)` в `src/services/firebase.ts:378`, но самой функции-минтера в `functions/` ещё нет — её надо написать).
- `spotifyId` хранится **полем** в документе пользователя, не ключом.
- Это сразу делает Firestore Rules безопасными: `request.auth.uid == userId`.

**Миграция `odl` → `uid`:**
1. Написать Cloud Function `mintFirebaseToken(spotifyId, code)` — минтит custom token с `uid = <стабильный id>`. Чтобы не плодить дубли, выбрать стабильный uid: либо `spotify:<spotifyId>`, либо детерминированно (как iOS уже делает).
2. Скрипт переноса существующих документов `users/{odl}` → `users/{uid}` (+ переписать ссылки в `scrobbles`, `likes`, `followers`, `notifications`).
3. На переходный период оставить в `User` поле `spotifyId` для совместимости со старыми ссылками.
4. Унифицировать имена полей скробблов (сейчас веб — `title/artist`, iOS — те же + `scrobbledAt`; зафиксировать один контракт в общем типе).

> ⚠️ `odl` как имя ключа — переименовать в `uid`/`id` при миграции. Сейчас оно консистентно, но семантически вводит в заблуждение.

---

## 3. Firestore: схема и безопасность

### Существующие коллекции (есть)
`users`, `scrobbles`, `followers`, `likes`, `notifications`

### Новые коллекции (под матч-петлю)
```
matches/{matchId}            # пара uid_a + uid_b, статус, score совместимости, createdAt
  likes/{uid}                # кто кого лайкнул (для определения взаимности) — или отдельная коллекция swipes
swipes/{swipeId}             # fromUid, toUid, direction(like/pass), createdAt
chats/{chatId}              # participants: [uidA, uidB], lastMessage, updatedAt
  messages/{messageId}       # senderUid, text | trackRef, createdAt, readBy
```

### Гео-подход (важно — Firestore не умеет радиус нативно)
- **MVP:** грубый матч по **городу/региону** (поле `city` или `geohashPrefix`). Дёшево, и идеально ложится на «старт глобально/по городу, плотность позже».
- **Позже:** точный «рядом» через **geohash** (`geofire-common`) — запрос по диапазону geohash + дофильтрация по расстоянию на клиенте.
- **Приватность:** портировать privacy-fuzzing из iOS (`LocationPrivacy`) — координаты размываются по уровню видимости до записи в Firestore. Точные координаты на сервер не уходят.

### 🔴 Firestore Rules — критический блокер (сейчас `allow read, write: if true`)
Без этого нельзя пускать ни одного живого юзера. Базовый каркас:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isSignedIn();
      allow write: if isOwner(uid);
    }
    match /scrobbles/{id} {
      allow read: if isSignedIn();
      allow create: if isOwner(request.resource.data.uid);
      allow update, delete: if isOwner(resource.data.uid);
    }
    match /swipes/{id} {
      allow read: if isOwner(resource.data.fromUid);
      allow create: if isOwner(request.resource.data.fromUid);
    }
    match /chats/{chatId} {
      allow read, write: if isSignedIn() && request.auth.uid in resource.data.participants;
      match /messages/{msgId} {
        allow read: if isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow create: if isOwner(request.resource.data.senderUid);
      }
    }
    // likesCount/notifications пишет ТОЛЬКО Cloud Function (admin обходит rules)
    match /likes/{id}    { allow read: if isSignedIn(); allow create, delete: if isOwner(request.resource.data.uid); }
    match /notifications/{id} { allow read: if isOwner(resource.data.uid); allow update: if isOwner(resource.data.uid); }
  }
}
```
*(каркас, не финал — выверить под реальные поля при реализации)*

---

## 4. Что портировать из iOS (твои лучшие активы — не пропадают)

| iOS-компонент | Зачем в вебе | Качество |
|---|---|---|
| `MusicMatchService` | **Сердце матчинга** — расчёт совместимости вкусов. Перенести алгоритм в TS | оттестирован ~95% |
| `LocationPrivacy` (fuzzing) | Размытие координат перед записью — приватность «рядом» | оттестирован ~90% |
| Логика чата (`ChatService`) | Модель чатов/сообщений как референс для web-чата | рабочая |

Алгоритм MusicMatch — это интеллектуальная собственность проекта; портировать в TS с переносом юнит-тестов (vitest).

---

## 5. Матч-петля (сердце продукта) — дизайн

**Экраны (web):**
1. **Discover** — стопка/лента кандидатов по убыванию совместимости (MusicMatch score). Фильтр «рядом» опционален.
2. **Карточка человека** — топ-артисты, общие артисты, что слушает сейчас, score, кнопки like/pass.
3. **Matches** — список взаимных мэтчей.
4. **Chat** — переписка + «поделиться треком» (suggestion уже есть в Cloud Functions).

**Поток:**
```
свайп like → swipes/{id}
   └─ Cloud Function onSwipeCreated: проверить встречный like
         └─ если взаимно → создать matches/{id} + chats/{id} + notification обоим
```
Cloud Functions уже умеют уведомления (`onLikeCreated`, `onFollowCreated`, `onSuggestionCreated`) — добавить `onSwipeCreated`/`onMatchCreated` по тому же паттерну.

---

## 6. PWA-инфраструктура (чего сейчас нет)

- [ ] `vite-plugin-pwa` + `manifest.webmanifest` (имя, иконки, theme_color, display: standalone)
- [ ] Иконки (192/512, maskable) — есть `music-illustration.png` как основа
- [ ] Service worker: офлайн-оболочка + кэш ассетов (Workbox через плагин)
- [ ] Экран «Установить приложение» (A2HS prompt)
- [ ] Геолокация через `navigator.geolocation` + запрос разрешения с объяснением
- [ ] Web Push (FCM Web) для мэтчей/сообщений — с явной пометкой про ограничение iOS
- [ ] Проверка Lighthouse PWA score

---

## 7. Дорожная карта по фазам

### Фаза 0 — Фундамент (блокеры запуска) ⛔ без этого людей не пускаем
- [ ] Единый ID: Cloud Function custom-token + миграция `odl`→`uid`
- [ ] **Firestore Rules** (закрыть `if true`)
- [ ] `.env` и секреты (Spotify Client ID/Secret) вынесены, server-side refresh токена через функцию
- [ ] Единый контракт типов scrobble/user (веб ↔ iOS)

### Фаза 1 — PWA-обёртка + живой веб
- [ ] PWA: manifest, SW, install, иконки
- [ ] Деплой в Firebase Hosting, домен
- [ ] Соло-ценность уже работает (скробблинг + лента) → можно звать первых

### Фаза 2 — Матч-петля (продукт)
- [ ] Порт `MusicMatchService` в TS (+ тесты)
- [ ] Discover-экран (глобально, по score)
- [ ] swipes + `onSwipeCreated` (взаимность → match)
- [ ] Matches-экран
- [ ] Web-чат (chats/messages + rules + UI) + «поделиться треком»

### Фаза 3 — «Рядом» (гео-слой)
- [ ] Порт `LocationPrivacy` (fuzzing)
- [ ] Грубый матч по городу → потом geohash-радиус
- [ ] Фильтр «рядом» в Discover

### Фаза 4 — Нативный iOS-компаньон
- [ ] iOS на единый backend (фоновый скробблинг + APNs push + нативная карта)

---

## 8. Чек-лист «можно пускать живых людей»
- [ ] Firestore Rules закрыты и протестированы (эмулятор)
- [ ] Секреты не в репозитории, refresh токена server-side
- [ ] Обработка ошибок с UI-feedback (не только консоль)
- [ ] Удаление аккаунта + данных (GDPR), политика приватности
- [ ] Блокировка/жалоба в чате (модерация) — логика есть в iOS, перенести
- [ ] Базовая аналитика (кто доходит до мэтча) + Sentry (уже подключён)

---

## 9. Риски и митигигация
| Риск | Митигация |
|---|---|
| **Пустая карта / нет плотности** | Лестница ценности: соло → глобальный матч → рядом. Гео не блокирует вход |
| Web Push слабый на iOS | Критичные пуши — позже через нативный iOS; в PWA — in-app + email-fallback |
| Нет фонового скробблинга в браузере | Скробблим при активной вкладке; фон — нативный iOS позже |
| Два клиента дорого тянуть соло | PWA-first; iOS откладываем до Фазы 4, переиспользуем алгоритмы, не UI |
| Открытые данные (rules) | Фаза 0, блокер №1 |

---

## 10. Ближайший шаг
Рекомендую начать с **Фазы 0** — она обязательна при любом раскладе и разблокирует всё остальное:
1. Cloud Function для custom-token (мост Spotify → Firebase Auth UID).
2. Firestore Rules.
3. Скрипт миграции `odl`→`uid`.

Скажи «поехали с фазой 0» — и начнём с Rules + функции custom-token.
