import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize artist name by removing features
 * (e.g., "Artist feat. Other" -> "Artist")
 */
function normalizeArtistName(artist: string): string {
  const separators = [",", " feat.", " feat ", " ft.", " ft ", " featuring ", " & ", " x ", " X "];
  let name = artist;
  for (const sep of separators) {
    const idx = name.toLowerCase().indexOf(sep.toLowerCase());
    if (idx > 0) name = name.substring(0, idx);
  }
  return name.trim();
}

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

// ============================================
// SCROBBLE STATS UPDATE
// ============================================

interface TopArtist {
  name: string;
  artistId?: string;
  count: number;
  imageUrl?: string;
}

interface TopAlbum {
  name: string;
  artist: string;
  count: number;
  imageUrl?: string;
}

export const onScrobbleCreated = onDocumentCreated("scrobbles/{scrobbleId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

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
    let topArtists: TopArtist[] = userData?.topArtists || [];
    let topAlbums: TopAlbum[] = userData?.topAlbums || [];

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
    } else {
      // New artist, add to list
      const newArtist: any = {
        name: normalizedArtist,
        count: 1,
      };
      if (artistId) newArtist.artistId = artistId;
      if (albumArtURL) newArtist.imageUrl = albumArtURL;
      topArtists.push(newArtist);
    }

    // Sort and keep top 20
    topArtists = topArtists
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Update top albums (only if album is provided)
    if (album) {
      const albumKey = `${album}|||${normalizedArtist}`;
      const albumIndex = topAlbums.findIndex(
        a => `${a.name}|||${a.artist}` === albumKey
      );

      if (albumIndex >= 0) {
        // Album exists, increment count
        topAlbums[albumIndex].count++;
        // Update imageUrl if available
        if (albumArtURL && !topAlbums[albumIndex].imageUrl) {
          topAlbums[albumIndex].imageUrl = albumArtURL;
        }
      } else {
        // New album, add to list
        const newAlbum: any = {
          name: album,
          artist: normalizedArtist,
          count: 1,
        };
        if (albumArtURL) newAlbum.imageUrl = albumArtURL;
        topAlbums.push(newAlbum);
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
  } catch (error) {
    console.error("Error updating scrobble stats:", error);
  }
});

// ============================================
// MIGRATION: Recalculate stats for all users
// ============================================

import {onRequest} from "firebase-functions/v2/https";

export const migrateUserStats = onRequest(async (req, res) => {
  // Security: Only allow GET requests (can add auth later)
  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    console.log("🚀 Starting migration: recalculating stats for all users...");

    // Get all scrobbles
    const scrobblesSnapshot = await db.collection("scrobbles").get();
    const scrobbles = scrobblesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        odl: data.odl,
        userId: data.userId,
        artist: data.artist,
        album: data.album,
        artistId: data.artistId,
        albumArtURL: data.albumArtURL
      };
    });

    console.log(`📊 Found ${scrobbles.length} total scrobbles`);

    // Group scrobbles by user (odl)
    type ScrobbleData = typeof scrobbles[0];
    const userScrobbles = new Map<string, ScrobbleData[]>();
    scrobbles.forEach(scrobble => {
      const odl = scrobble.odl || scrobble.userId;
      if (!odl) return;

      if (!userScrobbles.has(odl)) {
        userScrobbles.set(odl, []);
      }
      userScrobbles.get(odl)!.push(scrobble);
    });

    console.log(`👥 Found ${userScrobbles.size} users with scrobbles`);

    // Process each user
    const results = [];
    for (const [odl, userScrobblesList] of userScrobbles.entries()) {
      try {
        const userRef = db.collection("users").doc(odl);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          console.log(`⚠️  User ${odl} not found, skipping`);
          continue;
        }

        // Calculate scrobbles count
        const scrobblesCount = userScrobblesList.length;

        // Calculate top artists
        const artistMap = new Map<string, { count: number; artistId?: string; imageUrl?: string }>();
        userScrobblesList.forEach(scrobble => {
          const artist = scrobble.artist;
          if (!artist) return;

          const normalizedArtist = normalizeArtistName(artist);
          const existing = artistMap.get(normalizedArtist);

          if (existing) {
            existing.count++;
            // Update artistId if not present
            if (scrobble.artistId && !existing.artistId) {
              existing.artistId = scrobble.artistId;
            }
            // Update imageUrl if not present
            if (scrobble.albumArtURL && !existing.imageUrl) {
              existing.imageUrl = scrobble.albumArtURL;
            }
          } else {
            artistMap.set(normalizedArtist, {
              count: 1,
              artistId: scrobble.artistId || undefined,
              imageUrl: scrobble.albumArtURL || undefined
            });
          }
        });

        const topArtists: TopArtist[] = Array.from(artistMap.entries())
          .map(([name, data]) => {
            const artist: any = {
              name,
              count: data.count,
            };
            if (data.artistId) artist.artistId = data.artistId;
            if (data.imageUrl) artist.imageUrl = data.imageUrl;
            return artist as TopArtist;
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        // Calculate top albums
        const albumMap = new Map<string, { artist: string; count: number; imageUrl?: string }>();
        userScrobblesList.forEach(scrobble => {
          const album = scrobble.album;
          const artist = scrobble.artist;
          if (!album || !artist) return;

          const normalizedArtist = normalizeArtistName(artist);
          const albumKey = `${album}|||${normalizedArtist}`;
          const existing = albumMap.get(albumKey);

          if (existing) {
            existing.count++;
            // Update imageUrl if not present
            if (scrobble.albumArtURL && !existing.imageUrl) {
              existing.imageUrl = scrobble.albumArtURL;
            }
          } else {
            albumMap.set(albumKey, {
              artist: normalizedArtist,
              count: 1,
              imageUrl: scrobble.albumArtURL || undefined
            });
          }
        });

        const topAlbums: TopAlbum[] = Array.from(albumMap.entries())
          .map(([key, data]) => {
            const album: any = {
              name: key.split("|||")[0],
              artist: data.artist,
              count: data.count,
            };
            if (data.imageUrl) album.imageUrl = data.imageUrl;
            return album as TopAlbum;
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        // Update user document
        await userRef.update({
          scrobblesCount,
          topArtists,
          topAlbums
        });

        results.push({
          odl,
          scrobblesCount,
          topArtistsCount: topArtists.length,
          topAlbumsCount: topAlbums.length
        });

        console.log(`✅ ${odl}: ${scrobblesCount} scrobbles, ${topArtists.length} artists, ${topAlbums.length} albums`);
      } catch (error) {
        console.error(`❌ Error processing user ${odl}:`, error);
        results.push({ odl, error: String(error) });
      }
    }

    console.log("🎉 Migration completed!");

    res.json({
      success: true,
      message: "Migration completed successfully",
      totalUsers: userScrobbles.size,
      results
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    res.status(500).json({
      success: false,
      error: String(error)
    });
  }
});
