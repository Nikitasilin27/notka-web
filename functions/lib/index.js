"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeSpotifyToken = exports.onSuggestionCreated = exports.onFollowCreated = exports.onLikeDeleted = exports.onLikeCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
// ============================================
// LIKE FUNCTIONS
// ============================================
exports.onLikeCreated = functions.firestore
    .document("likes/{likeId}")
    .onCreate(async (snap) => {
    const data = snap.data();
    const { scrobbleId, ownerOdl, odl, odlName, odlAvatar, trackName, artistName } = data;
    // Don't notify yourself
    if (odl === ownerOdl)
        return null;
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
exports.onLikeDeleted = functions.firestore
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
exports.onFollowCreated = functions.firestore
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
exports.onSuggestionCreated = functions.firestore
    .document("suggestions/{suggestionId}")
    .onCreate(async (snap, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const d = snap.data();
    // Схема расходится: web пишет fromId/toId/trackName/artistName,
    // iOS — fromUserId/toUserId/trackTitle/trackArtist. Принимаем оба варианта.
    const fromId = (_a = d.fromId) !== null && _a !== void 0 ? _a : d.fromUserId;
    const toId = (_b = d.toId) !== null && _b !== void 0 ? _b : d.toUserId;
    const trackName = (_d = (_c = d.trackName) !== null && _c !== void 0 ? _c : d.trackTitle) !== null && _d !== void 0 ? _d : null;
    const artistName = (_f = (_e = d.artistName) !== null && _e !== void 0 ? _e : d.trackArtist) !== null && _f !== void 0 ? _f : null;
    if (!fromId || !toId) {
        console.warn(`onSuggestionCreated: нет from/to id, пропускаю ${context.params.suggestionId}`);
        return null;
    }
    // Имя/аватар отправителя: web кладёт их в документ, iOS — нет.
    // Если их нет — подтягиваем из users, чтобы не показывать "Someone".
    let fromName = d.fromName;
    let fromAvatar = (_g = d.fromAvatar) !== null && _g !== void 0 ? _g : null;
    if (!fromName) {
        const senderDoc = await db.collection("users").doc(fromId).get();
        const sender = senderDoc.data();
        fromName = sender === null || sender === void 0 ? void 0 : sender.name;
        fromAvatar = (_h = fromAvatar !== null && fromAvatar !== void 0 ? fromAvatar : sender === null || sender === void 0 ? void 0 : sender.avatarURL) !== null && _h !== void 0 ? _h : null;
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
exports.exchangeSpotifyToken = functions.https.onCall(async (data) => {
    const accessToken = data === null || data === void 0 ? void 0 : data.accessToken;
    if (!accessToken || typeof accessToken !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "accessToken is required");
    }
    // Верифицируем токен у Spotify — подделать нельзя, нужен реальный токен
    let spotifyId;
    try {
        const resp = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) {
            throw new functions.https.HttpsError("unauthenticated", `Spotify rejected the token (status ${resp.status})`);
        }
        const profile = await resp.json();
        spotifyId = profile.id;
    }
    catch (e) {
        if (e instanceof functions.https.HttpsError)
            throw e;
        throw new functions.https.HttpsError("internal", "Failed to verify Spotify token");
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
//# sourceMappingURL=index.js.map