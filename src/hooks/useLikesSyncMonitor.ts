import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { getRecentLikedTracks } from '../services/spotify';
import { getUser, likeScrobble } from '../services/firebase';
import { Scrobble } from '../types';

/**
 * Background monitor for syncing Spotify likes to Notka
 * Checks every 60 seconds for new Spotify likes and auto-likes them in Notka
 * Only syncs likes added AFTER crossLikeSyncStartedAt timestamp
 */
export function useLikesSyncMonitor() {
  const { spotifyId, user: authUser, avatarUrl } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Only run if authenticated
    if (!spotifyId || !authUser) {
      return;
    }

    const checkNewLikes = async () => {
      // Prevent concurrent checks
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        // Get user settings
        const user = await getUser(spotifyId);

        // Check if sync is enabled and direction is correct
        if (!user?.crossLikeEnabled ||
            user.crossLikeMode === 'notka_to_spotify') {
          return; // Skip if sync disabled or wrong direction
        }

        if (!user.crossLikeSyncStartedAt) {
          console.log('⏭ Sync monitor: No sync start timestamp');
          return;
        }

        // 1. Get recent liked tracks from Spotify (last 20)
        const recentLikes = await getRecentLikedTracks(20);
        if (recentLikes.length === 0) return;

        // 2. Filter: only tracks added AFTER crossLikeSyncStartedAt
        const syncStartTime = user.crossLikeSyncStartedAt.getTime();
        const newLikes = recentLikes.filter(like =>
          like.added_at.getTime() >= syncStartTime
        );

        if (newLikes.length === 0) {
          console.log('⏭ Sync monitor: No new likes since', user.crossLikeSyncStartedAt);
          return;
        }

        // 3. Auto-like all new Spotify likes in Notka
        // Note: likeScrobble is idempotent (won't create duplicates)
        for (const like of newLikes) {
          const track = like.track;

          // Create pseudo-scrobble and like it
          const pseudoScrobbleId = `sync_${spotifyId}_${track.id}_${Date.now()}`;
          const pseudoScrobble: Scrobble = {
            id: pseudoScrobbleId,
            odl: spotifyId,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            trackId: track.id,
            artistId: track.artists[0]?.id,
            albumArtURL: track.album.images[0]?.url,
            timestamp: like.added_at,
            isLikedOnSpotify: true
          };

          try {
            await likeScrobble(pseudoScrobble, {
              odl: spotifyId,
              name: user.name,
              avatar: avatarUrl || undefined
            });

            console.log('🔄 Sync monitor: Auto-liked in Notka:', track.name);
          } catch (err) {
            console.error('Sync monitor error for track:', track.name, err);
          }
        }

      } catch (error) {
        console.error('Sync monitor error:', error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Initial check after 5 seconds (give time for app to load)
    const initialTimeout = setTimeout(checkNewLikes, 5000);

    // Then check every 60 seconds
    intervalRef.current = setInterval(checkNewLikes, 60000);

    console.log('🔄 Sync monitor: Started');

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearTimeout(initialTimeout);
      console.log('🔄 Sync monitor: Stopped');
    };
  }, [spotifyId, authUser, avatarUrl]);
}
