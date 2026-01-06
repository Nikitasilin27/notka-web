import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ============================================
// LIKE FUNCTIONS
// ============================================

export const onLikeCreated = onDocumentCreated("likes/{likeId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  const { scrobbleId, ownerOdl, odl, odlName, odlAvatar, trackName, artistName } = data;

  // Don't notify yourself
  if (odl === ownerOdl) return;

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
});

export const onLikeDeleted = onDocumentDeleted("likes/{likeId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const { scrobbleId } = snap.data();

  await db.collection("scrobbles").doc(scrobbleId).update({
    likesCount: admin.firestore.FieldValue.increment(-1)
  });
});

// ============================================
// FOLLOW NOTIFICATION
// ============================================

export const onFollowCreated = onDocumentCreated("followers/{followId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

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
});

// ============================================
// SUGGESTION NOTIFICATION
// ============================================

export const onSuggestionCreated = onDocumentCreated("suggestions/{suggestionId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const { fromId, toId, fromName, fromAvatar, trackName, artistName } = snap.data();

  const notifId = `${toId}_${Date.now()}`;
  await db.collection("notifications").doc(notifId).set({
    odl: toId,
    type: "suggestion",
    fromOdl: fromId,
    fromName: fromName || "Someone",
    fromAvatar: fromAvatar || null,
    data: {
      suggestionId: event.params.suggestionId,
      trackName,
      artistName,
    },
    read: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});
