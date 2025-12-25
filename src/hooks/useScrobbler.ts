import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentlyPlaying } from '../services/spotify';
import { updateCurrentTrack, addScrobble } from '../services/firebase';
import { SpotifyCurrentlyPlaying, Scrobble, SpotifyTrack } from '../types';
import { useAuth } from './useAuth';

const POLL_INTERVAL = 5000; // 5 seconds - check more often for track changes
const SCROBBLE_THRESHOLD = 0.5; // Scrobble if listened > 50%
const MIN_TRACK_DURATION = 30000; // Don't scrobble tracks shorter than 30s
const MIN_LISTEN_TIME = 15000; // Minimum 15 seconds listened

interface TrackState {
  track: SpotifyTrack;
  startedAt: number;
  maxProgress: number;
  scrobbled: boolean;
}

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
  
  // Track the current/previous track state
  const currentTrackRef = useRef<TrackState | null>(null);

  const scrobbleTrack = useCallback(async (trackState: TrackState) => {
    if (!spotifyId) return;
    
    const { track, startedAt, maxProgress } = trackState;
    
    // Check if track qualifies for scrobble
    const listenedTime = Date.now() - startedAt;
    const listenedPercent = maxProgress / track.duration_ms;
    
    // Must have listened > 50% OR at least 4 minutes, AND minimum 15 seconds
    const qualifies = 
      track.duration_ms >= MIN_TRACK_DURATION &&
      listenedTime >= MIN_LISTEN_TIME &&
      (listenedPercent >= SCROBBLE_THRESHOLD || listenedTime >= 240000);
    
    if (!qualifies) {
      console.log('Track did not qualify for scrobble:', track.name, {
        listenedPercent: Math.round(listenedPercent * 100) + '%',
        listenedTime: Math.round(listenedTime / 1000) + 's'
      });
      return;
    }
    
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
        setLastScrobble({ ...scrobble, id });
        console.log('✓ Scrobbled:', track.name);
      }
    } catch (err) {
      console.error('Scrobble failed:', err);
    } finally {
      setIsScrobbling(false);
    }
  }, [spotifyId]);

  const checkPlayback = useCallback(async () => {
    if (!isAuthenticated || !spotifyId) return;

    try {
      const playing = await getCurrentlyPlaying();
      setCurrentlyPlaying(playing);

      const currentTrack = currentTrackRef.current;
      const newTrack = playing?.item;
      const isPlaying = playing?.is_playing ?? false;

      // Case 1: Nothing playing now
      if (!newTrack || !isPlaying) {
        // If we had a track playing, scrobble it
        if (currentTrack && !currentTrack.scrobbled) {
          currentTrack.scrobbled = true;
          await scrobbleTrack(currentTrack);
        }
        
        // Clear current track in Firebase
        if (currentTrack) {
          await updateCurrentTrack(spotifyId, null);
          currentTrackRef.current = null;
        }
        return;
      }

      // Case 2: Track changed
      if (currentTrack && currentTrack.track.id !== newTrack.id) {
        // Scrobble the previous track
        if (!currentTrack.scrobbled) {
          currentTrack.scrobbled = true;
          await scrobbleTrack(currentTrack);
        }
        
        // Start tracking new track
        currentTrackRef.current = {
          track: newTrack,
          startedAt: Date.now() - (playing.progress_ms || 0),
          maxProgress: playing.progress_ms || 0,
          scrobbled: false,
        };
        
        // Update current track in Firebase
        await updateCurrentTrack(spotifyId, {
          trackId: newTrack.id,
          trackName: newTrack.name,
          artistName: newTrack.artists.map(a => a.name).join(', '),
          albumArtURL: newTrack.album.images[0]?.url,
        });
        
        console.log('Now playing:', newTrack.name);
        return;
      }

      // Case 3: Same track still playing - update max progress
      if (currentTrack && currentTrack.track.id === newTrack.id) {
        const progress = playing.progress_ms || 0;
        if (progress > currentTrack.maxProgress) {
          currentTrack.maxProgress = progress;
        }
        return;
      }

      // Case 4: First track (no previous track)
      if (!currentTrack) {
        currentTrackRef.current = {
          track: newTrack,
          startedAt: Date.now() - (playing.progress_ms || 0),
          maxProgress: playing.progress_ms || 0,
          scrobbled: false,
        };
        
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
  }, [isAuthenticated, spotifyId, scrobbleTrack]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial check
    checkPlayback();
    
    // Poll for changes
    const interval = setInterval(checkPlayback, POLL_INTERVAL);

    // Cleanup: scrobble current track when component unmounts
    return () => {
      clearInterval(interval);
      const currentTrack = currentTrackRef.current;
      if (currentTrack && !currentTrack.scrobbled) {
        currentTrack.scrobbled = true;
        scrobbleTrack(currentTrack);
      }
    };
  }, [isAuthenticated, checkPlayback, scrobbleTrack]);

  return {
    currentlyPlaying,
    isScrobbling,
    lastScrobble,
    error,
  };
}
