import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentlyPlaying } from '../services/spotify';
import { updateCurrentTrack, addScrobble } from '../services/firebase';
import { SpotifyCurrentlyPlaying, Scrobble, SpotifyTrack } from '../types';
import { useAuth } from './useAuth';

const POLL_INTERVAL = 5000; // 5 seconds

// Last.fm scrobbling rules:
// - Track must be longer than 30 seconds
// - Track must be played for at least 50% OR 4 minutes (whichever comes first)
const MIN_TRACK_DURATION = 30000; // 30 seconds
const SCROBBLE_PERCENT = 0.5; // 50% of track
const SCROBBLE_MAX_TIME = 4 * 60 * 1000; // 4 minutes

interface TrackSession {
  trackId: string;
  track: SpotifyTrack;
  startTime: number;
  maxProgress: number;
  scrobbled: boolean;
}

// Persistent state across component remounts
const globalState = {
  currentSession: null as TrackSession | null,
  lastScrobbledTrackId: null as string | null,
  lastScrobbledTime: 0,
  isScrobbling: false,
  initialized: false,
};

// Reset global state on page load/refresh
if (typeof window !== 'undefined') {
  // Reset on page visibility change (tab switch back)
  const resetOnVisible = () => {
    if (document.visibilityState === 'visible') {
      globalState.currentSession = null;
      globalState.initialized = false;
    }
  };
  document.removeEventListener('visibilitychange', resetOnVisible);
  document.addEventListener('visibilitychange', resetOnVisible);
}

interface UseScrobblerReturn {
  currentlyPlaying: SpotifyCurrentlyPlaying | null;
  isScrobbling: boolean;
  isLoading: boolean;
  lastScrobble: Scrobble | null;
  error: string | null;
}

export function useScrobbler(): UseScrobblerReturn {
  const { spotifyId, isAuthenticated } = useAuth();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<SpotifyCurrentlyPlaying | null>(null);
  const [isScrobbling, setIsScrobbling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastScrobble, setLastScrobble] = useState<Scrobble | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstCheck = useRef(true);

  // Calculate when to scrobble
  const getScrobbleThreshold = useCallback((durationMs: number): number => {
    const halfDuration = durationMs * SCROBBLE_PERCENT;
    return Math.min(halfDuration, SCROBBLE_MAX_TIME);
  }, []);

  // Check if track should be scrobbled
  const shouldScrobble = useCallback((session: TrackSession): boolean => {
    if (session.scrobbled) return false;
    if (session.track.duration_ms < MIN_TRACK_DURATION) return false;
    
    const threshold = getScrobbleThreshold(session.track.duration_ms);
    return session.maxProgress >= threshold;
  }, [getScrobbleThreshold]);

  // Perform scrobble
  const doScrobble = useCallback(async (session: TrackSession): Promise<boolean> => {
    if (!spotifyId || globalState.isScrobbling) return false;
    
    // Check for duplicate (same track within 3 minutes)
    if (globalState.lastScrobbledTrackId === session.trackId) {
      const timeSince = Date.now() - globalState.lastScrobbledTime;
      if (timeSince < 3 * 60 * 1000) {
        console.log(`⏭ Skip duplicate: ${session.track.name}`);
        return false;
      }
    }
    
    globalState.isScrobbling = true;
    setIsScrobbling(true);
    
    try {
      const scrobble: Omit<Scrobble, 'id'> = {
        odl: spotifyId,
        trackId: session.trackId,
        title: session.track.name,
        artist: session.track.artists.map(a => a.name).join(', '),
        album: session.track.album.name,
        albumArtURL: session.track.album.images[0]?.url,
        timestamp: new Date(session.startTime),
        duration: session.track.duration_ms,
      };

      const id = await addScrobble(scrobble);
      
      if (id) {
        globalState.lastScrobbledTrackId = session.trackId;
        globalState.lastScrobbledTime = Date.now();
        setLastScrobble({ ...scrobble, id });
        
        const dur = Math.round(session.track.duration_ms / 1000);
        console.log(`✓ Scrobbled: ${session.track.name} (${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')})`);
        return true;
      }
    } catch (err) {
      console.error('Scrobble error:', err);
      setError(err instanceof Error ? err.message : 'Scrobble failed');
    } finally {
      globalState.isScrobbling = false;
      setIsScrobbling(false);
    }
    return false;
  }, [spotifyId]);

  // Main polling function
  const checkPlayback = useCallback(async () => {
    if (!isAuthenticated || !spotifyId) return;

    try {
      const playing = await getCurrentlyPlaying();
      
      // Mark as loaded after first check
      if (isFirstCheck.current) {
        isFirstCheck.current = false;
        setIsLoading(false);
        globalState.initialized = true;
      }
      
      setCurrentlyPlaying(playing);

      const track = playing?.item;
      const isPlaying = playing?.is_playing ?? false;
      const progressMs = playing?.progress_ms || 0;

      // CASE 1: Nothing playing or paused
      if (!track || !isPlaying) {
        // Scrobble previous track if it qualifies
        if (globalState.currentSession && shouldScrobble(globalState.currentSession)) {
          await doScrobble(globalState.currentSession);
          globalState.currentSession.scrobbled = true;
        }
        
        // Clear current track in Firebase
        if (globalState.currentSession) {
          await updateCurrentTrack(spotifyId, null);
          globalState.currentSession = null;
          console.log('⏸ Playback stopped');
        }
        return;
      }

      // CASE 2: Track changed
      if (!globalState.currentSession || track.id !== globalState.currentSession.trackId) {
        // Scrobble previous track if it qualifies
        if (globalState.currentSession && shouldScrobble(globalState.currentSession)) {
          const prevTrack = globalState.currentSession;
          if (!prevTrack.scrobbled) {
            await doScrobble(prevTrack);
          }
        }
        
        // Start new session
        globalState.currentSession = {
          trackId: track.id,
          track: track,
          startTime: Date.now() - progressMs,
          maxProgress: progressMs,
          scrobbled: false,
        };
        
        await updateCurrentTrack(spotifyId, {
          trackId: track.id,
          trackName: track.name,
          artistName: track.artists.map(a => a.name).join(', '),
          albumArtURL: track.album.images[0]?.url,
        });
        
        const dur = Math.round(track.duration_ms / 1000);
        const scrobAt = Math.round(getScrobbleThreshold(track.duration_ms) / 1000);
        console.log(`▶ Now: ${track.name} (${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}, scrobble@${scrobAt}s)`);
        return;
      }

      // CASE 3: Same track still playing - update progress
      if (globalState.currentSession) {
        if (progressMs > globalState.currentSession.maxProgress) {
          globalState.currentSession.maxProgress = progressMs;
        }
        
        // Check if we should scrobble now
        if (shouldScrobble(globalState.currentSession)) {
          const scrobbled = await doScrobble(globalState.currentSession);
          if (scrobbled) {
            globalState.currentSession.scrobbled = true;
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error('Scrobbler error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      if (isFirstCheck.current) {
        isFirstCheck.current = false;
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, spotifyId, shouldScrobble, doScrobble, getScrobbleThreshold]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    // Reset state on mount
    isFirstCheck.current = true;
    setIsLoading(true);
    
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
    isLoading,
    lastScrobble,
    error,
  };
}
