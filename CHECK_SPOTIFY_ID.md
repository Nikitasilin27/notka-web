# Как проверить Spotify ID

## Через Spotify Web Console:
1. Открой: https://developer.spotify.com/console/get-current-user/
2. Нажми "Get Token" → выбери scope "user-read-private"
3. Нажми "Try It"
4. Смотри поле "id" в ответе

## Правильный Spotify ID:
- Длина: 20-30 символов
- Формат: буквы + цифры (alphanumeric)
- Пример: `31kmnt2opmpkymgs7ida55oulr6q`

## Неправильный (username):
- Короткий (5-15 символов)
- Может содержать подчёркивания
- Пример: `cdubz516`

## Что делать если ID = username:

1. Проверь Spotify API response:
   - Открой DevTools → Network
   - Залогинься в Notka
   - Найди запрос к `api.spotify.com/v1/me`
   - Проверь поле "id"

2. Если ID правильный в API, но неправильный в БД:
   - Удали пользователя `cdubz516` из Firebase
   - Перелогинься в Notka
   - Новый пользователь создастся с правильным ID
