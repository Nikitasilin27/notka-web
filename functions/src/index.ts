import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ============================================
// LIKE FUNCTIONS
// ============================================

export const onLikeCreated = functions.firestore
  .document("likes/{likeId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const { scrobbleId, ownerOdl, odl, odlName, odlAvatar, trackName, artistName } = data;

    // Don't notify yourself
    if (odl === ownerOdl) return null;

    const batch = db.batch();

    // 1. Increment likesCount
    const scrobbleRef = db.collection("scrobbles").doc(scrobbleId);
    batch.update(scrobbleRef, {
      likesCount: admin.firestore.FieldValue.increment(1)
    });

    // 2. Create notification
    const notifId = `${ownerOdl}_${Date.now()}`;
    const notifRef = db.collection("notifications").doc(notifId);
    batch.set(notifRef, {
      odl: ownerOdl,
      type: "like",
      fromOdl: odl,
      fromName: odlName || "Someone",
      fromAvatar: odlAvatar || null,
      data: { scrobbleId, trackName, artistName },
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    console.log(`Like: ${odl} -> ${scrobbleId}`);
    return null;
  });

export const onLikeDeleted = functions.firestore
  .document("likes/{likeId}")
  .onDelete(async (snap) => {
    const { scrobbleId } = snap.data();
    
    await db.collection("scrobbles").doc(scrobbleId).update({
      likesCount: admin.firestore.FieldValue.increment(-1)
    });
    
    return null;
  });

// ============================================
// FOLLOW NOTIFICATION
// ============================================

export const onFollowCreated = functions.firestore
  .document("followers/{followId}")
  .onCreate(async (snap) => {
    const { followerId, followingId, followerName, followerAvatar } = snap.data();

    const notifId = `${followingId}_${Date.now()}`;
    await db.collection("notifications").doc(notifId).set({
      odl: followingId,
      type: "follow",
      fromOdl: followerId,
      fromName: followerName || "Someone",
      fromAvatar: followerAvatar || null,
      data: {},
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return null;
  });

// ============================================
// SUGGESTION NOTIFICATION  
// ============================================

export const onSuggestionCreated = functions.firestore
  .document("suggestions/{suggestionId}")
  .onCreate(async (snap, context) => {
    const d = snap.data();

    // Схема расходится: web пишет fromId/toId/trackName/artistName,
    // iOS — fromUserId/toUserId/trackTitle/trackArtist. Принимаем оба варианта.
    const fromId = d.fromId ?? d.fromUserId;
    const toId = d.toId ?? d.toUserId;
    const trackName = d.trackName ?? d.trackTitle ?? null;
    const artistName = d.artistName ?? d.trackArtist ?? null;

    if (!fromId || !toId) {
      console.warn(
        `onSuggestionCreated: нет from/to id, пропускаю ${context.params.suggestionId}`
      );
      return null;
    }

    // Имя/аватар отправителя: web кладёт их в документ, iOS — нет.
    // Если их нет — подтягиваем из users, чтобы не показывать "Someone".
    let fromName = d.fromName as string | undefined;
    let fromAvatar = (d.fromAvatar as string | null | undefined) ?? null;
    if (!fromName) {
      const senderDoc = await db.collection("users").doc(fromId).get();
      const sender = senderDoc.data();
      fromName = sender?.name;
      fromAvatar = fromAvatar ?? sender?.avatarURL ?? null;
    }

    const notifId = `${toId}_${Date.now()}`;
    await db.collection("notifications").doc(notifId).set({
      odl: toId,
      type: "suggestion",
      fromOdl: fromId,
      fromName: fromName || "Someone",
      fromAvatar: fromAvatar || null,
      data: {
        suggestionId: context.params.suggestionId,
        trackName,
        artistName,
      },
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return null;
  });

// ============================================
// AUTH: Spotify -> Firebase custom token  (Фаза 0)
// ============================================
// Проверяет Spotify access token вызовом /me и минтит Firebase custom token,
// у которого uid == Spotify user id. Так uid совпадает с существующими ключами
// документов `users/{odl}` — и Firestore Rules могут безопасно проверять
// request.auth.uid БЕЗ миграции данных на вебе.

// Node 20 даёт global fetch в рантайме; объявляем тип (в functions нет @types/node)
declare const fetch: (
  url: string,
  init?: { headers?: Record<string, string> }
) => Promise<{ ok: boolean; status: number; json: () => Promise<{ id?: string }> }>;

export const exchangeSpotifyToken = functions.https.onCall(async (data) => {
  const accessToken = data?.accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "accessToken is required"
    );
  }

  // Верифицируем токен у Spotify — подделать нельзя, нужен реальный токен
  let spotifyId: string | undefined;
  try {
    const resp = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        `Spotify rejected the token (status ${resp.status})`
      );
    }
    const profile = await resp.json();
    spotifyId = profile.id;
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    throw new functions.https.HttpsError(
      "internal",
      "Failed to verify Spotify token"
    );
  }

  if (!spotifyId) {
    throw new functions.https.HttpsError("internal", "Spotify profile has no id");
  }

  // uid == spotifyId → совпадает с существующими документами users/{odl}
  const token = await admin.auth().createCustomToken(spotifyId, {
    spotifyId,
    provider: "spotify",
  });

  console.log(`Custom token minted for spotifyId=${spotifyId}`);
  return { token, spotifyId };
});
