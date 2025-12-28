import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentlyPlaying } from '../services/spotify';
import { updateCurrentTrack, addScrobble } from '../services/firebase';
import { SpotifyCurrentlyPlaying, Scrobble, SpotifyTrack } from '../types';
import { useAuth } from './useAuth';

const POLL_INTERVAL = 5000; // 5 seconds
const SCROBBLE_THRESHOLD = 0.5; // 50%
const MIN_TRACK_DURATION = 30000; // 30s
const MIN_LISTEN_TIME = 15000; // 15s

// Global state to prevent duplicates across component remounts
const globalScrobbleState = {
  lastScrobbledTrackId: null as string | null,
  lastScrobbledTime: 0,
  currentTrackId: null as string | null,
  currentTrackStarted: 0,
  currentTrackProgress: 0,
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

  const shouldScrobble = useCallback((trackId: string, _startedAt: number): boolean => {
    // Don't scrobble the same track within 3 minutes
    if (globalScrobbleState.lastScrobbledTrackId === trackId) {
      const timeSinceLastScrobble = Date.now() - globalScrobbleState.lastScrobbledTime;
      if (timeSinceLastScrobble < 3 * 60 * 1000) {
        console.log('Skipping duplicate scrobble for:', trackId);
        return false;
      }
    }
    return true;
  }, []);

  const scrobbleTrack = useCallback(async (
    track: SpotifyTrack, 
    startedAt: number, 
    maxProgress: number
  ) => {
    if (!spotifyId || globalScrobbleState.isScrobbling) return;
    
    // Check if qualifies
    const listenedTime = Date.now() - startedAt;
    const listenedPercent = maxProgress / track.duration_ms;
    
    const qualifies = 
      track.duration_ms >= MIN_TRACK_DURATION &&
      listenedTime >= MIN_LISTEN_TIME &&
      (listenedPercent >= SCROBBLE_THRESHOLD || listenedTime >= 240000);
    
    if (!qualifies) {
      console.log('Track did not qualify:', track.name, {
        percent: Math.round(listenedPercent * 100) + '%',
        time: Math.round(listenedTime / 1000) + 's'
      });
      return;
    }

    // Check for duplicate
    if (!shouldScrobble(track.id, startedAt)) {
      return;
    }
    
    globalScrobbleState.isScrobbling = true;
    setIsScrobbling(true);
    
    try {
      const scrobble: Omit<Scrobble, 'id'> = {
        odl: spotifyId,
        trackId: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        albumArtURL: track.album.images[0]?.url,
        timestamp: new Date(startedAt),
        duration: track.duration_ms,
      };

      const id = await addScrobble(scrobble);
      if (id) {
        // Update global state
        globalScrobbleState.lastScrobbledTrackId = track.id;
        globalScrobbleState.lastScrobbledTime = Date.now();
        
        setLastScrobble({ ...scrobble, id });
        console.log('✓ Scrobbled:', track.name);
      }
    } catch (err) {
      console.error('Scrobble failed:', err);
    } finally {
      globalScrobbleState.isScrobbling = false;
      setIsScrobbling(false);
    }
  }, [spotifyId, shouldScrobble]);

  const checkPlayback = useCallback(async () => {
    if (!isAuthenticated || !spotifyId) return;

    try {
      const playing = await getCurrentlyPlaying();
      setCurrentlyPlaying(playing);

      const newTrack = playing?.item;
      const isPlaying = playing?.is_playing ?? false;
      const progress = playing?.progress_ms || 0;

      // Nothing playing
      if (!newTrack || !isPlaying) {
        // Scrobble previous track if there was one
        if (globalScrobbleState.currentTrackId && globalScrobbleState.currentTrackProgress > 0) {
          // We need to fetch the track info to scrobble - skip for now
          // The scrobble will happen when track changes
        }
        
        if (globalScrobbleState.currentTrackId) {
          await updateCurrentTrack(spotifyId, null);
          globalScrobbleState.currentTrackId = null;
          globalScrobbleState.currentTrackStarted = 0;
          globalScrobbleState.currentTrackProgress = 0;
        }
        return;
      }

      // Track changed
      if (globalScrobbleState.currentTrackId && globalScrobbleState.currentTrackId !== newTrack.id) {
        // Get previous track info from playing state is not possible
        // So we skip scrobbling here - it happens via Firebase duplicate check
        
        // Start tracking new track
        globalScrobbleState.currentTrackId = newTrack.id;
        globalScrobbleState.currentTrackStarted = Date.now() - progress;
        globalScrobbleState.currentTrackProgress = progress;
        
        await updateCurrentTrack(spotifyId, {
          trackId: newTrack.id,
          trackName: newTrack.name,
          artistName: newTrack.artists.map(a => a.name).join(', '),
          albumArtURL: newTrack.album.images[0]?.url,
        });
        
        console.log('Now playing:', newTrack.name);
        return;
      }

      // Same track - update progress
      if (globalScrobbleState.currentTrackId === newTrack.id) {
        if (progress > globalScrobbleState.currentTrackProgress) {
          globalScrobbleState.currentTrackProgress = progress;
        }
        
        // Check if we should scrobble now (passed threshold)
        const listenedPercent = progress / newTrack.duration_ms;
        const listenedTime = Date.now() - globalScrobbleState.currentTrackStarted;
        
        if (
          listenedPercent >= SCROBBLE_THRESHOLD && 
          listenedTime >= MIN_LISTEN_TIME &&
          shouldScrobble(newTrack.id, globalScrobbleState.currentTrackStarted)
        ) {
          await scrobbleTrack(newTrack, globalScrobbleState.currentTrackStarted, progress);
        }
        return;
      }

      // First track
      if (!globalScrobbleState.currentTrackId) {
        globalScrobbleState.currentTrackId = newTrack.id;
        globalScrobbleState.currentTrackStarted = Date.now() - progress;
        globalScrobbleState.currentTrackProgress = progress;
        
        await updateCurrentTrack(spotifyId, {
          trackId: newTrack.id,
          trackName: newTrack.name,
          artistName: newTrack.artists.map(a => a.name).join(', '),
          albumArtURL: newTrack.album.images[0]?.url,
        });
        
        console.log('Started tracking:', newTrack.name);
      }

      setError(null);
    } catch (err) {
      console.error('Scrobbler error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [isAuthenticated, spotifyId, scrobbleTrack, shouldScrobble]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial check
    checkPlayback();
    
    // Poll for changes - use ref to avoid creating new intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(checkPlayback, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Don't scrobble on unmount - it causes duplicates
    };
  }, [isAuthenticated, checkPlayback]);

  return {
    currentlyPlaying,
    isScrobbling,
    lastScrobble,
    error,
  };
}
