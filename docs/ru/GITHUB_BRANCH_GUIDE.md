#  Инструкция: Работа с Веткой в GitHub

##  Информация о Ветке

**Название ветки:** `claude/project-review-plan-Wwhez`
**Репозиторий:** Nikitasilin27/notka-web
**Базовая ветка:** main (или основная ветка проекта)
**Создана:** Автоматически при начале работы
**Назначение:** Разработка улучшений для превращения MVP в Minimal Lovable Product

---

##  Быстрый Старт

### Проверка Текущей Ветки

```bash
# Посмотреть на какой ветке вы находитесь
git branch

# Должно показать:
# * claude/project-review-plan-Wwhez
```

### Проверка Статуса

```bash
# Посмотреть изменения
git status

# Посмотреть последние коммиты
git log --oneline -5
```

---

##  Отправка Изменений в GitHub

### 1. Коммит Изменений

```bash
# Посмотреть что изменилось
git status

# Добавить все файлы
git add .

# Или добавить конкретные файлы
git add PROJECT_IMPROVEMENT_PLAN.md GITHUB_BRANCH_GUIDE.md

# Создать коммит с осмысленным сообщением
git commit -m "Add comprehensive project improvement plan and documentation"

# Или для русских сообщений
git commit -m "Добавлен план улучшений проекта MVP → MLP"
```

### 2. Отправка в GitHub (Push)

**ВАЖНО:** Используйте `-u origin` при первом push для установки upstream:

```bash
# Первая отправка ветки
git push -u origin claude/project-review-plan-Wwhez

# Последующие отправки
git push
```

**Возможные ошибки и решения:**

#### Ошибка 403 (Forbidden)
```
Если получаете HTTP 403:
- Убедитесь, что название ветки начинается с 'claude/'
- Проверьте права доступа к репозиторию
```

#### Network Error - Retry Logic
```bash
# При сетевой ошибке подождите 2 секунды и повторите
sleep 2 && git push

# При повторной ошибке - 4 секунды
sleep 4 && git push

# При третьей ошибке - 8 секунд
sleep 8 && git push

# При четвертой ошибке - 16 секунд
sleep 16 && git push
```

---

##  Синхронизация с Основной Веткой

### Обновление от Main

```bash
# Получить последние изменения
git fetch origin main

# Слить изменения из main в вашу ветку
git merge origin/main

# Или rebase (для более чистой истории)
git rebase origin/main

# Если были конфликты, разрешите их и продолжите
git add .
git rebase --continue
```

### Обновление Вашей Ветки с Сервера

```bash
# Скачать изменения вашей ветки
git pull origin claude/project-review-plan-Wwhez

# С автоматическим rebase
git pull --rebase origin claude/project-review-plan-Wwhez
```

---

##  Создание Pull Request

### Через GitHub Web Interface

1. **Перейдите в репозиторий на GitHub:**
   ```
   https://github.com/Nikitasilin27/notka-web
   ```

2. **Кликните на кнопку "Compare & pull request"**
   - Появится после push новой ветки

3. **Заполните информацию о PR:**
   ```markdown
   Заголовок:  MVP → Minimal Lovable Product: Comprehensive Improvements

   Описание:
   ## Summary
   Комплексный план улучшений для превращения Notka из MVP в Minimal Lovable Product

   ## Что включено
   -  Детальный анализ текущего состояния проекта
   -  Выявление критических проблем (безопасность, тесты)
   -  План работ на 6 фаз разработки
   -  Метрики успеха и приоритизация
   -  Идеи для дифференциации продукта

   ## Критические находки
   -  Firestore Rules полностью открыты (anyone can read/write)
   -  Отсутствие тестов (0% coverage)
   -  Нет обработки ошибок
   -  Hardcoded конфигурация

   ## План действий
   Смотрите `PROJECT_IMPROVEMENT_PLAN.md` для детального плана

   ## Test plan
   - [ ] Документация проверена на актуальность
   - [ ] План согласован с командой
   - [ ] Приоритеты установлены
   ```

4. **Выберите базовую ветку:**
   - Base: `main` (или ваша основная ветка)
   - Compare: `claude/project-review-plan-Wwhez`

5. **Создайте PR**
   - Кликните "Create Pull Request"

### Через GitHub CLI (gh)

```bash
# Установите GitHub CLI если ещё не установлен
# https://cli.github.com/

# Создайте PR
gh pr create \
  --title " MVP → Minimal Lovable Product: Comprehensive Improvements" \
  --body "$(cat <<'EOF'
## Summary
Комплексный план улучшений для превращения Notka из MVP в Minimal Lovable Product

## Что включено
-  Детальный анализ текущего состояния проекта
-  Выявление критических проблем (безопасность, тесты)
-  План работ на 6 фаз разработки
-  Метрики успеха и приоритизация

## Критические находки
-  Firestore Rules полностью открыты
-  Отсутствие тестов (0% coverage)
-  Нет обработки ошибок

Смотрите PROJECT_IMPROVEMENT_PLAN.md для деталей
EOF
)" \
  --base main
```

---

##  Best Practices для Коммитов

### Структура Коммита

```bash
# Формат
<type>(<scope>): <subject>

<body>

<footer>

# Примеры
feat(docs): add comprehensive improvement plan
fix(security): update firestore rules to restrict access
docs(readme): add setup instructions
refactor(api): optimize firebase queries
test(auth): add unit tests for authentication
```

### Типы Коммитов

- `feat` - новая функциональность
- `fix` - исправление бага
- `docs` - документация
- `style` - форматирование, пропущенные точки с запятой
- `refactor` - рефакторинг кода
- `test` - добавление тестов
- `chore` - обновление зависимостей, build конфигурации

### Примеры Хороших Коммитов

```bash
git commit -m "docs: add project improvement plan with 6 development phases"
git commit -m "docs: create GitHub workflow guide for team collaboration"
git commit -m "chore: add .env.example for environment configuration"
git commit -m "fix(security): implement strict Firestore security rules"
git commit -m "feat(ui): add toast notifications for user feedback"
git commit -m "test: setup Vitest and add tests for useAuth hook"
```

---

##  Просмотр Изменений

### Локальные Изменения

```bash
# Посмотреть что изменилось (diff)
git diff

# Посмотреть конкретный файл
git diff PROJECT_IMPROVEMENT_PLAN.md

# Посмотреть staging area
git diff --cached
```

### История Коммитов

```bash
# Краткая история
git log --oneline

# Детальная история с графом
git log --graph --oneline --all

# История конкретного файла
git log --follow PROJECT_IMPROVEMENT_PLAN.md

# История с изменениями
git log -p
```

---

##  Полезные Команды

### Отмена Изменений

```bash
# Отменить изменения в файле (до staging)
git checkout -- PROJECT_IMPROVEMENT_PLAN.md

# Убрать файл из staging
git reset HEAD PROJECT_IMPROVEMENT_PLAN.md

# Отменить последний коммит (сохранить изменения)
git reset --soft HEAD~1

# Отменить последний коммит (удалить изменения) 
git reset --hard HEAD~1
```

### Stash (Временное Сохранение)

```bash
# Сохранить незакоммиченные изменения
git stash

# Посмотреть список stash
git stash list

# Вернуть последний stash
git stash pop

# Применить конкретный stash
git stash apply stash@{0}
```

### Branching

```bash
# Посмотреть все ветки
git branch -a

# Создать новую ветку
git checkout -b feature/new-feature

# Переключиться на другую ветку
git checkout main

# Удалить локальную ветку
git branch -d feature/old-feature

# Удалить удаленную ветку
git push origin --delete feature/old-feature
```

---

##  Решение Проблем

### Конфликты при Merge

```bash
# После git merge или git pull
# Если есть конфликты:

# 1. Посмотреть какие файлы конфликтуют
git status

# 2. Открыть файл и найти маркеры конфликта
# <<<<<<< HEAD
# ваши изменения
# =======
# изменения из другой ветки
# >>>>>>> branch-name

# 3. Исправить конфликты вручную

# 4. Добавить исправленные файлы
git add .

# 5. Завершить merge
git commit -m "Merge main into claude/project-review-plan-Wwhez"
```

### Случайный Коммит в Неправильную Ветку

```bash
# Если закоммитили в main вместо feature ветки:

# 1. Запомнить хэш коммита
git log --oneline -1

# 2. Вернуться на main
git reset --hard HEAD~1

# 3. Переключиться на правильную ветку
git checkout claude/project-review-plan-Wwhez

# 4. Cherry-pick коммит
git cherry-pick <commit-hash>
```

### Случайный Push

```bash
#  ОСТОРОЖНО: используйте только если уверены

# Отменить последний коммит на сервере
git revert HEAD
git push

# Или force push (ОПАСНО, используйте только на feature ветках)
git reset --hard HEAD~1
git push --force origin claude/project-review-plan-Wwhez
```

---

##  Workflow для Разработки

### Рекомендуемый Процесс

1. **Начало работы над задачей:**
   ```bash
   git checkout claude/project-review-plan-Wwhez
   git pull origin claude/project-review-plan-Wwhez
   ```

2. **Внесение изменений:**
   ```bash
   # Работайте над кодом
   # Тестируйте изменения
   ```

3. **Коммит изменений:**
   ```bash
   git add .
   git commit -m "feat: implement X feature"
   ```

4. **Отправка на сервер:**
   ```bash
   git push origin claude/project-review-plan-Wwhez
   ```

5. **Создание PR:**
   - Используйте GitHub UI или `gh pr create`

6. **Code Review:**
   - Ждите ревью
   - Вносите правки по комментариям
   - Push изменений автоматически обновит PR

7. **Merge:**
   - После аппрува мержите PR в main
   - Удалите ветку (опционально)

---

##  GitHub Actions (CI/CD)

### Текущие Workflows

Проект уже имеет GitHub Actions workflows:

```bash
.github/workflows/
├── firebase-hosting-merge.yml          # Деплой при merge в main
└── firebase-hosting-pull-request.yml   # Preview для PR
```

### Что Происходит при Push

1. **При создании PR:**
   - Автоматический build проекта
   - Deploy preview на Firebase Hosting
   - Комментарий в PR с preview URL

2. **При merge в main:**
   - Production build
   - Deploy на production Firebase Hosting

---

##  Безопасность

### НЕ Коммитьте:

 `.env` файлы с секретами
 `firebase-debug.log`
 API ключи
 Пароли/токены
 Personal access tokens

### Проверьте .gitignore:

```bash
# Посмотреть что игнорируется
cat .gitignore

# Проверить что файл игнорируется
git check-ignore -v .env
```

---

##  Дополнительные Ресурсы

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub CLI Manual](https://cli.github.com/manual/)

---

##  Вопросы?

Если возникли вопросы или проблемы:

1. Проверьте этот документ
2. Посмотрите `git status` и `git log`
3. Загуглите ошибку
4. Спросите в команде

---

**Создано:** 31.12.2025
**Версия:** 1.0
**Ветка:** claude/project-review-plan-Wwhez
