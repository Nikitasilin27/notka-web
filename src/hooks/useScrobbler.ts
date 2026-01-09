import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentlyPlaying, isTrackLiked, getTrackLikedDate } from '../services/spotify';
import { updateCurrentTrack, addScrobble, getLastUserScrobble, getUser, likeScrobble } from '../services/firebase';
import { SpotifyCurrentlyPlaying, Scrobble, SpotifyTrack } from '../types';
import { useAuth } from './useAuth';
import { logger } from '../utils/logger';

// Adaptive polling intervals
const POLL_INTERVAL_PLAYING = 10000; // 10 seconds when music is playing
const POLL_INTERVAL_PAUSED = 30000; // 30 seconds when paused/stopped
const POLL_INTERVAL_ERROR = 60000; // 60 seconds after error

// Exponential backoff settings
const MAX_BACKOFF_TIME = 5 * 60 * 1000; // Max 5 minutes
const BACKOFF_MULTIPLIER = 2;

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
  lastScrobbleLoaded: false,
  // Exponential backoff state
  consecutiveErrors: 0,
  backoffTime: 0,
  lastErrorTime: 0,
};

// Reset global state on page load/refresh
if (typeof window !== 'undefined') {
  // Reset on page visibility change (tab switch back)
  const resetOnVisible = () => {
    if (document.visibilityState === 'visible') {
      globalState.currentSession = null;
      globalState.initialized = false;
      // Don't reset lastScrobble info - we need it!
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
  const [lastScrobbleLoaded, setLastScrobbleLoaded] = useState(globalState.lastScrobbleLoaded);
  const [pollInterval, setPollInterval] = useState(POLL_INTERVAL_PLAYING);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstCheck = useRef(true);

  // Calculate adaptive poll interval based on playback state
  const calculatePollInterval = useCallback((isPlaying: boolean, hasError: boolean): number => {
    if (hasError) {
      // Exponential backoff on errors
      if (globalState.consecutiveErrors > 0) {
        const backoff = Math.min(
          POLL_INTERVAL_ERROR * Math.pow(BACKOFF_MULTIPLIER, globalState.consecutiveErrors - 1),
          MAX_BACKOFF_TIME
        );
        logger.log(`Backoff: ${backoff / 1000}s (${globalState.consecutiveErrors} errors)`);
        return backoff;
      }
      return POLL_INTERVAL_ERROR;
    }

    // Reset backoff on success
    if (globalState.consecutiveErrors > 0) {
      globalState.consecutiveErrors = 0;
      globalState.backoffTime = 0;
      logger.log('Backoff reset - connection restored');
    }

    // Adaptive polling based on playback state
    return isPlaying ? POLL_INTERVAL_PLAYING : POLL_INTERVAL_PAUSED;
  }, []);

  // Load last scrobble from Firebase on mount (prevents page reload duplicates)
  useEffect(() => {
    if (!spotifyId || globalState.lastScrobbleLoaded) {
      setLastScrobbleLoaded(true);
      return;
    }
    
    const loadLastScrobble = async () => {
      try {
        const lastScrobbleData = await getLastUserScrobble(spotifyId);
        if (lastScrobbleData && lastScrobbleData.trackId) {
          globalState.lastScrobbledTrackId = lastScrobbleData.trackId;
          globalState.lastScrobbledTime = lastScrobbleData.timestamp.getTime();
          logger.log('📚 Loaded last scrobble:', lastScrobbleData.title);
        }
      } catch (e) {
        logger.error('Failed to load last scrobble:', e);
      } finally {
        globalState.lastScrobbleLoaded = true;
        setLastScrobbleLoaded(true);
      }
    };
    
    loadLastScrobble();
  }, [spotifyId]);

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
        logger.log(`⏭ Skip duplicate: ${session.track.name}`);
        return false;
      }
    }
    
    globalState.isScrobbling = true;
    setIsScrobbling(true);
    
    try {
      // Check if track is liked on Spotify
      let isLikedOnSpotify = false;
      try {
        isLikedOnSpotify = await isTrackLiked(session.trackId);
      } catch (e) {
        logger.log('Could not check Spotify like status:', e);
      }
      
      const scrobble: Omit<Scrobble, 'id'> = {
        odl: spotifyId,
        trackId: session.trackId,
        artistId: session.track.artists[0]?.id, // Primary artist ID for accurate image
        title: session.track.name,
        artist: session.track.artists.map(a => a.name).join(', '),
        album: session.track.album.name,
        albumArtURL: session.track.album.images[0]?.url,
        timestamp: new Date(session.startTime),
        duration: session.track.duration_ms,
        isLikedOnSpotify,
        likesCount: 0,
      };

      const id = await addScrobble(scrobble);

      if (id) {
        globalState.lastScrobbledTrackId = session.trackId;
        globalState.lastScrobbledTime = Date.now();
        setLastScrobble({ ...scrobble, id });

        // Cross-like sync: Spotify → Notka (only for new likes)
        if (isLikedOnSpotify) {
          try {
            const user = await getUser(spotifyId);
            if (user?.crossLikeEnabled &&
                (user.crossLikeMode === 'spotify_to_notka' || user.crossLikeMode === 'both')) {

              // Check when track was added to Spotify Liked Songs
              const likedDate = await getTrackLikedDate(session.trackId);
              const syncStartedAt = user.crossLikeSyncStartedAt;

              // Only auto-like if track was added AFTER sync was enabled
              if (likedDate && syncStartedAt && likedDate >= syncStartedAt) {
                await likeScrobble({ ...scrobble, id }, {
                  odl: spotifyId,
                  name: user.name,
                  avatar: user.avatarURL
                });
                logger.log('🔄 Auto-liked in Notka (Spotify sync - new like)');
              } else if (!syncStartedAt) {
                // Backward compatibility: if no sync start date, don't sync old likes
                logger.log('⏭ Skipped old like (sync started before timestamp tracking)');
              } else {
                logger.log('⏭ Skipped old like (added before sync was enabled)');
              }
            }
          } catch (err) {
            logger.error('Cross-like sync error:', err);
          }
        }

        const dur = Math.round(session.track.duration_ms / 1000);
        const likeIcon = isLikedOnSpotify ? ' 💚' : '';
        logger.log(`✓ Scrobbled: ${session.track.name} (${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')})${likeIcon}`);
        return true;
      }
    } catch (err) {
      logger.error('Scrobble error:', err);
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
          logger.log('⏸ Playback stopped');
        }
        return;
      }

      // CASE 2: Track changed (or first load)
      if (!globalState.currentSession || track.id !== globalState.currentSession.trackId) {
        // Scrobble previous track if it qualifies
        if (globalState.currentSession && shouldScrobble(globalState.currentSession)) {
          const prevTrack = globalState.currentSession;
          if (!prevTrack.scrobbled) {
            await doScrobble(prevTrack);
          }
        }
        
        // Check if this track was ALREADY scrobbled recently (prevents page reload duplicates)
        const threshold = getScrobbleThreshold(track.duration_ms);
        const alreadyPastThreshold = progressMs >= threshold * 0.9; // 90% of threshold
        
        let wasAlreadyScrobbled = false;
        if (alreadyPastThreshold) {
          // This track is already past scrobble point - check if we already scrobbled it
          wasAlreadyScrobbled = globalState.lastScrobbledTrackId === track.id &&
            (Date.now() - globalState.lastScrobbledTime) < 10 * 60 * 1000; // 10 min
        }
        
        // Start new session
        globalState.currentSession = {
          trackId: track.id,
          track: track,
          startTime: Date.now() - progressMs,
          maxProgress: progressMs,
          scrobbled: wasAlreadyScrobbled, // Mark as already scrobbled if past threshold on load
        };
        
        await updateCurrentTrack(spotifyId, {
          trackId: track.id,
          trackName: track.name,
          artistName: track.artists.map(a => a.name).join(', '),
          albumArtURL: track.album.images[0]?.url,
        });
        
        const dur = Math.round(track.duration_ms / 1000);
        const scrobAt = Math.round(threshold / 1000);
        const status = wasAlreadyScrobbled ? '(already scrobbled)' : '';
        logger.log(`▶ Now: ${track.name} (${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}, scrobble@${scrobAt}s) ${status}`);
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

      // Update poll interval based on playback state
      const newInterval = calculatePollInterval(isPlaying, false);
      if (newInterval !== pollInterval) {
        setPollInterval(newInterval);
        logger.log(`Poll interval: ${isPlaying ? 'playing' : 'paused'} (${newInterval / 1000}s)`);
      }
    } catch (err) {
      logger.error('Scrobbler error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Track consecutive errors for exponential backoff
      globalState.consecutiveErrors++;
      globalState.lastErrorTime = Date.now();

      // Update poll interval with exponential backoff
      const newInterval = calculatePollInterval(false, true);
      if (newInterval !== pollInterval) {
        setPollInterval(newInterval);
      }

      if (isFirstCheck.current) {
        isFirstCheck.current = false;
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, spotifyId, shouldScrobble, doScrobble, getScrobbleThreshold, calculatePollInterval, pollInterval]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    // Wait for last scrobble to be loaded from Firebase first
    if (!lastScrobbleLoaded) {
      return;
    }

    // Reset state on mount
    isFirstCheck.current = true;
    setIsLoading(true);

    // Initial check
    checkPlayback();

    // Start polling with adaptive interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(checkPlayback, pollInterval);
    logger.log(`Polling started: ${pollInterval / 1000}s interval`);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, checkPlayback, lastScrobbleLoaded, pollInterval]);

  return {
    currentlyPlaying,
    isScrobbling,
    isLoading,
    lastScrobble,
    error,
  };
}
