import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentlyPlaying } from '../services/spotify';
import { updateCurrentTrack, addScrobble } from '../services/firebase';
import { SpotifyCurrentlyPlaying, Scrobble, SpotifyTrack } from '../types';
import { useAuth } from './useAuth';

const POLL_INTERVAL = 5000; // 5 seconds

// Last.fm scrobbling rules:
// - Track must be longer than 30 seconds
// - Track must be played for at least 50% OR 4 minutes (whichever comes first)
// - Scrobble only ONCE per listening session
const MIN_TRACK_DURATION = 30000; // 30 seconds minimum track length
const SCROBBLE_PERCENT = 0.5; // 50% of track
const SCROBBLE_MAX_TIME = 4 * 60 * 1000; // 4 minutes max wait

// Global state persists across component remounts
const globalState = {
  // Current track being tracked
  currentTrackId: null as string | null,
  currentTrackStartTime: 0,
  currentTrack: null as SpotifyTrack | null,
  
  // Scrobble status for current session
  hasScrobbledCurrentTrack: false,
  
  // Last scrobbled track (to prevent re-scrobbling on loop)
  lastScrobbledTrackId: null as string | null,
  lastScrobbledTimestamp: 0,
  
  // Lock to prevent concurrent scrobbles
  isScrobbling: false,
};

interface UseScrobblerReturn {
  currentlyPlaying: SpotifyCurrentlyPlaying | null;
  isScrobbling: boolean;
  lastScrobble: Scrobble | null;
  error: string | null;
}

export function useScrobbler(): UseScrobblerReturn {
  const { spotifyId, isAuthenticated } = useAuth();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<SpotifyCurrentlyPlaying | null>(null);
  const [isScrobbling, setIsScrobbling] = useState(false);
  const [lastScrobble, setLastScrobble] = useState<Scrobble | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if track qualifies for scrobbling based on progress
  const shouldScrobbleNow = useCallback((track: SpotifyTrack, progressMs: number): boolean => {
    // Already scrobbled this track in current session
    if (globalState.hasScrobbledCurrentTrack) {
      return false;
    }
    
    // Track too short
    if (track.duration_ms < MIN_TRACK_DURATION) {
      return false;
    }
    
    // Calculate thresholds
    const halfwayPoint = track.duration_ms * SCROBBLE_PERCENT;
    const scrobbleAt = Math.min(halfwayPoint, SCROBBLE_MAX_TIME);
    
    // Have we listened enough?
    if (progressMs >= scrobbleAt) {
      // Check for repeat play (same track played again)
      if (globalState.lastScrobbledTrackId === track.id) {
        const timeSinceLastScrobble = Date.now() - globalState.lastScrobbledTimestamp;
        // Don't scrobble same track within 3 minutes (allows for repeats)
        if (timeSinceLastScrobble < 3 * 60 * 1000) {
          console.log(`⏭ Skipping repeat: ${track.name} (played ${Math.round(timeSinceLastScrobble / 1000)}s ago)`);
          globalState.hasScrobbledCurrentTrack = true; // Mark as "handled"
          return false;
        }
      }
      return true;
    }
    
    return false;
  }, []);

  // Perform the scrobble
  const doScrobble = useCallback(async (track: SpotifyTrack) => {
    if (!spotifyId || globalState.isScrobbling || globalState.hasScrobbledCurrentTrack) {
      return;
    }
    
    globalState.isScrobbling = true;
    setIsScrobbling(true);
    
    try {
      const scrobble: Omit<Scrobble, 'id'> = {
        odl: spotifyId,
        trackId: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        albumArtURL: track.album.images[0]?.url,
        timestamp: new Date(globalState.currentTrackStartTime),
        duration: track.duration_ms,
      };

      const id = await addScrobble(scrobble);
      
      if (id) {
        // Mark as scrobbled
        globalState.hasScrobbledCurrentTrack = true;
        globalState.lastScrobbledTrackId = track.id;
        globalState.lastScrobbledTimestamp = Date.now();
        
        setLastScrobble({ ...scrobble, id });
        
        const durationSec = Math.round(track.duration_ms / 1000);
        console.log(`✓ Scrobbled: ${track.name} (${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')})`);
      }
    } catch (err) {
      console.error('Scrobble failed:', err);
      setError(err instanceof Error ? err.message : 'Scrobble failed');
    } finally {
      globalState.isScrobbling = false;
      setIsScrobbling(false);
    }
  }, [spotifyId]);

  // Main polling function
  const checkPlayback = useCallback(async () => {
    if (!isAuthenticated || !spotifyId) return;

    try {
      const playing = await getCurrentlyPlaying();
      setCurrentlyPlaying(playing);

      const track = playing?.item;
      const isPlaying = playing?.is_playing ?? false;
      const progressMs = playing?.progress_ms || 0;

      // Nothing playing or paused
      if (!track || !isPlaying) {
        if (globalState.currentTrackId) {
          console.log('⏸ Playback stopped');
          await updateCurrentTrack(spotifyId, null);
          // Don't reset state - keep tracking in case of pause/resume
        }
        return;
      }

      // NEW TRACK started
      if (track.id !== globalState.currentTrackId) {
        // Reset state for new track
        globalState.currentTrackId = track.id;
        globalState.currentTrack = track;
        globalState.currentTrackStartTime = Date.now() - progressMs;
        globalState.hasScrobbledCurrentTrack = false;
        
        await updateCurrentTrack(spotifyId, {
          trackId: track.id,
          trackName: track.name,
          artistName: track.artists.map(a => a.name).join(', '),
          albumArtURL: track.album.images[0]?.url,
        });
        
        const durationSec = Math.round(track.duration_ms / 1000);
        const scrobbleAtSec = Math.round(Math.min(track.duration_ms * SCROBBLE_PERCENT, SCROBBLE_MAX_TIME) / 1000);
        console.log(`▶ Now playing: ${track.name} (${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}, scrobble at ${scrobbleAtSec}s)`);
      }

      // Check if we should scrobble
      if (shouldScrobbleNow(track, progressMs)) {
        await doScrobble(track);
      }

      setError(null);
    } catch (err) {
      console.error('Scrobbler error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [isAuthenticated, spotifyId, shouldScrobbleNow, doScrobble]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial check
    checkPlayback();
    
    // Start polling
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(checkPlayback, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, checkPlayback]);

  return {
    currentlyPlaying,
    isScrobbling,
    lastScrobble,
    error,
  };
}
