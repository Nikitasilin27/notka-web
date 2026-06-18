/**
 * Фаза 0 — миграция/нормализация идентификаторов: odl → канонический uid.
 *
 * КОНТЕКСТ. В Notka канонический ключ пользователя = Firebase Auth UID, и он
 * уже совпадает со Spotify ID: Cloud Function `exchangeSpotifyToken` минтит
 * custom token с `uid == spotifyId`, а веб исторически ключует документы
 * `users/{odl}`, где `odl` и есть Spotify ID. То есть ПЕРЕКЕИВАТЬ документы не
 * нужно — ключи уже канонические. Этот скрипт закрывает реальный хвост Фазы 0:
 * приводит ПОЛЯ к единому контракту (веб ↔ iOS) поверх существующих ключей.
 *
 * Что делает (идемпотентно, безопасно повторять):
 *   users/{uid}        — материализует поля `uid` и `spotifyId` (= id документа).
 *   scrobbles/{id}     — выставляет канонический `uid` и дублирует в `odl`+`userId`
 *                        (совместимость веб/iOS); добивает парные таймстемпы
 *                        `timestamp` и `scrobbledAt` один из другого.
 *   likes/{id}         — материализует `uid` (= liker `odl`/`userId`).
 *   notifications/{id} — материализует `uid` (= получатель `odl`).
 *   followers/{id}     — проверка целостности (followerId/followingId уже = uid).
 *
 * РАБОТАЕТ ЧЕРЕЗ ADMIN SDK. После Фазы 0 Firestore Rules закрыты
 * (`request.auth.uid == ...`), поэтому клиентский SDK миграцию не запишет —
 * admin обходит правила.
 *
 * ЗАПУСК:
 *   # 1. Установить зависимости (firebase-admin добавлен в devDependencies):
 *   npm install
 *   # 2. Указать сервис-аккаунт (как в CI — secrets.FIREBASE_SERVICE_ACCOUNT):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   #    либо: node scripts/migrate-odl-to-uid.js --key /path/to/sa.json
 *
 *   # DRY-RUN (по умолчанию — ничего не пишет, только показывает план):
 *   node scripts/migrate-odl-to-uid.js
 *   # ПРИМЕНИТЬ:
 *   node scripts/migrate-odl-to-uid.js --commit
 *
 * Флаги:
 *   --commit            реально записать изменения (без него — dry-run)
 *   --key <path>        путь к JSON сервис-аккаунта
 *   --project <id>      project id (по умолчанию из SA или notka-mvp)
 *   --only <names>      ограничить коллекции, через запятую
 *                       (users,scrobbles,likes,notifications,followers)
 */

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

// ---- разбор аргументов --------------------------------------------------
const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(`--${name}`);
}
function opt(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}

const COMMIT = flag('commit');
const KEY_PATH = opt('key', process.env.GOOGLE_APPLICATION_CREDENTIALS);
const PROJECT_ID = opt('project', undefined);
const ONLY = opt('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALL_COLLECTIONS = [
  'users',
  'scrobbles',
  'likes',
  'notifications',
  'followers',
];
const COLLECTIONS = ONLY.length ? ONLY : ALL_COLLECTIONS;

// ---- инициализация admin ------------------------------------------------
function initAdmin() {
  if (KEY_PATH) {
    const sa = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: PROJECT_ID || sa.project_id,
    });
  } else {
    // Application Default Credentials (gcloud auth application-default login)
    admin.initializeApp({ projectId: PROJECT_ID || 'notka-mvp' });
  }
  return admin.firestore();
}

// ---- утилита батч-записи (Firestore: лимит 500 операций на батч) ---------
function makeWriter(db) {
  let batch = db.batch();
  let count = 0;
  let total = 0;
  return {
    async update(ref, data) {
      total++;
      if (!COMMIT) return;
      batch.set(ref, data, { merge: true });
      if (++count >= 450) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    },
    async flush() {
      if (COMMIT && count > 0) await batch.commit();
      return total;
    },
  };
}

// ---- сборка патча на документ (возвращает только изменившиеся поля) ------
function pick(data, patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null) continue;
    if (data[k] !== v) out[k] = v;
  }
  return out;
}

function migrateUser(id, data) {
  // Канонический uid = id документа (== Spotify ID == Firebase Auth UID).
  return pick(data, { uid: id, spotifyId: id });
}

function migrateScrobble(_id, data) {
  const uid = data.odl || data.userId || data.uid;
  if (!uid) return { orphan: true };
  const patch = { uid, odl: uid, userId: uid };
  // Парные таймстемпы: добиваем недостающий из существующего.
  if (data.timestamp && !data.scrobbledAt) patch.scrobbledAt = data.timestamp;
  if (data.scrobbledAt && !data.timestamp) patch.timestamp = data.scrobbledAt;
  return pick(data, patch);
}

function migrateLike(_id, data) {
  const uid = data.odl || data.userId || data.uid;
  if (!uid) return { orphan: true };
  return pick(data, { uid });
}

function migrateNotification(_id, data) {
  const uid = data.odl || data.uid;
  if (!uid) return { orphan: true };
  return pick(data, { uid });
}

function migrateFollower(_id, data) {
  // followerId/followingId уже = uid; только сверяем целостность.
  if (!data.followerId || !data.followingId) return { orphan: true };
  return {};
}

const MIGRATORS = {
  users: migrateUser,
  scrobbles: migrateScrobble,
  likes: migrateLike,
  notifications: migrateNotification,
  followers: migrateFollower,
};

// ---- прогон одной коллекции --------------------------------------------
async function migrateCollection(db, name) {
  const migrator = MIGRATORS[name];
  const writer = makeWriter(db);
  const snap = await db.collection(name).get();

  let changed = 0;
  let orphans = 0;
  for (const doc of snap.docs) {
    const patch = migrator(doc.id, doc.data());
    if (patch.orphan) {
      orphans++;
      console.warn(`  ⚠ ${name}/${doc.id}: нет идентификатора — пропущен`);
      continue;
    }
    if (Object.keys(patch).length === 0) continue; // уже нормализован
    changed++;
    await writer.update(doc.ref, patch);
  }
  await writer.flush();

  const verb = COMMIT ? 'обновлено' : 'будет обновлено';
  console.log(
    `• ${name}: всего ${snap.size}, ${verb} ${changed}` +
      (orphans ? `, осиротевших ${orphans}` : '')
  );
  return { total: snap.size, changed, orphans };
}

// ---- main ---------------------------------------------------------------
async function main() {
  if (!KEY_PATH) {
    console.log(
      'ℹ Сервис-аккаунт не указан (--key / GOOGLE_APPLICATION_CREDENTIALS) — ' +
        'пробую Application Default Credentials.'
    );
  }
  const db = initAdmin();

  console.log(
    `\n${COMMIT ? '🚀 COMMIT' : '🔍 DRY-RUN'} — коллекции: ${COLLECTIONS.join(', ')}\n`
  );

  const summary = [];
  for (const name of COLLECTIONS) {
    if (!MIGRATORS[name]) {
      console.warn(`Пропуск неизвестной коллекции: ${name}`);
      continue;
    }
    summary.push([name, await migrateCollection(db, name)]);
  }

  const totalChanged = summary.reduce((s, [, r]) => s + r.changed, 0);
  const totalOrphans = summary.reduce((s, [, r]) => s + r.orphans, 0);
  console.log(
    `\nИтог: ${COMMIT ? 'обновлено' : 'к обновлению'} ${totalChanged} док.` +
      (totalOrphans ? `, осиротевших ${totalOrphans}` : '')
  );
  if (!COMMIT) {
    console.log('Это был DRY-RUN. Запусти с --commit, чтобы применить.');
  }
  await admin.app().delete();
}

main().catch((e) => {
  console.error('Миграция упала:', e);
  process.exit(1);
});
