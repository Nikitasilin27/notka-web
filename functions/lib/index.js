"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onScrobbleCreated = exports.onSuggestionCreated = exports.onFollowCreated = exports.onLikeDeleted = exports.onLikeCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Normalize artist name by removing features
 * (e.g., "Artist feat. Other" -> "Artist")
 */
function normalizeArtistName(artist) {
    const separators = [",", " feat.", " feat ", " ft.", " ft ", " featuring ", " & ", " x ", " X "];
    let name = artist;
    for (const sep of separators) {
        const idx = name.toLowerCase().indexOf(sep.toLowerCase());
        if (idx > 0)
            name = name.substring(0, idx);
    }
    return name.trim();
}
// ============================================
// LIKE FUNCTIONS
// ============================================
exports.onLikeCreated = (0, firestore_1.onDocumentCreated)("likes/{likeId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const { scrobbleId, ownerOdl, odl, odlName, odlAvatar, trackName, artistName } = data;
    // Don't notify yourself
    if (odl === ownerOdl)
        return;
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
exports.onLikeDeleted = (0, firestore_1.onDocumentDeleted)("likes/{likeId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const { scrobbleId } = snap.data();
    await db.collection("scrobbles").doc(scrobbleId).update({
        likesCount: admin.firestore.FieldValue.increment(-1)
    });
});
// ============================================
// FOLLOW NOTIFICATION
// ============================================
exports.onFollowCreated = (0, firestore_1.onDocumentCreated)("followers/{followId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
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
exports.onSuggestionCreated = (0, firestore_1.onDocumentCreated)("suggestions/{suggestionId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
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
exports.onScrobbleCreated = (0, firestore_1.onDocumentCreated)("scrobbles/{scrobbleId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const scrobbleData = snap.data();
    const { odl, artist, album, artistId, albumArtURL } = scrobbleData;
    if (!odl || !artist) {
        console.log("Missing odl or artist, skipping stats update");
        return;
    }
    try {
        const userRef = db.collection("users").doc(odl);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            console.log(`User ${odl} not found, skipping stats update`);
            return;
        }
        const userData = userDoc.data();
        let topArtists = (userData === null || userData === void 0 ? void 0 : userData.topArtists) || [];
        let topAlbums = (userData === null || userData === void 0 ? void 0 : userData.topAlbums) || [];
        // Update top artists
        const normalizedArtist = normalizeArtistName(artist);
        const artistIndex = topArtists.findIndex(a => a.name === normalizedArtist);
        if (artistIndex >= 0) {
            // Artist exists, increment count
            topArtists[artistIndex].count++;
            // Update artistId and imageUrl if available
            if (artistId && !topArtists[artistIndex].artistId) {
                topArtists[artistIndex].artistId = artistId;
            }
            if (albumArtURL && !topArtists[artistIndex].imageUrl) {
                topArtists[artistIndex].imageUrl = albumArtURL;
            }
        }
        else {
            // New artist, add to list
            topArtists.push({
                name: normalizedArtist,
                artistId: artistId || undefined,
                count: 1,
                imageUrl: albumArtURL || undefined,
            });
        }
        // Sort and keep top 20
        topArtists = topArtists
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        // Update top albums (only if album is provided)
        if (album) {
            const albumKey = `${album}|||${normalizedArtist}`;
            const albumIndex = topAlbums.findIndex(a => `${a.name}|||${a.artist}` === albumKey);
            if (albumIndex >= 0) {
                // Album exists, increment count
                topAlbums[albumIndex].count++;
                // Update imageUrl if available
                if (albumArtURL && !topAlbums[albumIndex].imageUrl) {
                    topAlbums[albumIndex].imageUrl = albumArtURL;
                }
            }
            else {
                // New album, add to list
                topAlbums.push({
                    name: album,
                    artist: normalizedArtist,
                    count: 1,
                    imageUrl: albumArtURL || undefined,
                });
            }
            // Sort and keep top 20
            topAlbums = topAlbums
                .sort((a, b) => b.count - a.count)
                .slice(0, 20);
        }
        // Update user document
        await userRef.update({
            topArtists,
            topAlbums,
        });
        console.log(`✅ Updated stats for ${odl}: ${topArtists.length} artists, ${topAlbums.length} albums`);
    }
    catch (error) {
        console.error("Error updating scrobble stats:", error);
    }
});
//# sourceMappingURL=index.js.map