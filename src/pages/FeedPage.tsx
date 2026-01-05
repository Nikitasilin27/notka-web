import { useState, useEffect, useCallback } from 'react';
import { TabProvider, TabList, Tab } from '@gravity-ui/uikit';
import { useAuth } from '../hooks/useAuth';
import { useScrobbler } from '../hooks/useScrobbler';
import { useI18n, formatTimeI18n } from '../hooks/useI18n';
import { useOnboarding } from '../hooks/useOnboarding';
import { useLikesSyncMonitor } from '../hooks/useLikesSyncMonitor';
import {
  getUser,
  likeScrobble,
  unlikeScrobble,
  checkLikedScrobbles,
  subscribeToRecentScrobbles,
  subscribeToFollowingScrobbles
} from '../services/firebase';
import { addTrackToSpotifyLikes, removeTrackFromSpotifyLikes } from '../services/spotify';
import { Scrobble, User } from '../types';
import { NowPlaying } from '../components/NowPlaying';
import { ScrobbleCard } from '../components/ScrobbleCard';
import { ScrobbleCardSkeletonList } from '../components/ScrobbleCardSkeleton';
import { showSuccess, showError } from '../utils/notifications';

type TabId = 'all' | 'following';

export function FeedPage() {
  const { spotifyId, user, avatarUrl } = useAuth();
  const { currentlyPlaying, isLoading: isScrobblerLoading } = useScrobbler();
  const { t, lang } = useI18n();
  useOnboarding(); // Show welcome message for new users
  useLikesSyncMonitor(); // Background sync for Spotify → Notka likes
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const [likedScrobbleIds, setLikedScrobbleIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [nowPlayingLiked, setNowPlayingLiked] = useState(false);

  // Real-time subscription to scrobbles
  useEffect(() => {
    if (!spotifyId && activeTab !== 'all') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let unsubscribe: (() => void) | undefined;

    if (activeTab === 'all') {
      unsubscribe = subscribeToRecentScrobbles(50, handleScrobblesUpdate);
    } else if (activeTab === 'following' && spotifyId) {
      unsubscribe = subscribeToFollowingScrobbles(spotifyId, 50, handleScrobblesUpdate);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeTab, spotifyId]);

  // Check if currently playing track is liked
  useEffect(() => {
    const checkNowPlayingLiked = async () => {
      if (!currentlyPlaying?.item?.id || !spotifyId) {
        setNowPlayingLiked(false);
        return;
      }
      
      const trackId = currentlyPlaying.item.id;
      
      // Check existing scrobble
      const matchingScrobble = scrobbles.find(s => s.trackId === trackId);
      if (matchingScrobble && likedScrobbleIds.has(matchingScrobble.id)) {
        setNowPlayingLiked(true);
        return;
      }
      
      // Check pseudo-scrobble ID
      const pseudoScrobbleId = `now_${spotifyId}_${trackId}`;
      if (likedScrobbleIds.has(pseudoScrobbleId)) {
        setNowPlayingLiked(true);
        return;
      }
      
      setNowPlayingLiked(false);
    };
    
    checkNowPlayingLiked();
  }, [currentlyPlaying?.item?.id, spotifyId, scrobbles, likedScrobbleIds]);

  // Handle real-time scrobbles updates
  const handleScrobblesUpdate = useCallback(async (data: Scrobble[]) => {
    try {
      setScrobbles(data);

      // Load user info for scrobbles
      const userIds = [...new Set(data.map(s => s.odl))];
      const users = await Promise.all(userIds.map(id => getUser(id)));
      const map = new Map<string, User>();
      users.forEach(user => {
        if (user) map.set(user.odl, user);
      });
      setUsersMap(map);

      // Check which scrobbles current user has liked
      if (spotifyId && data.length > 0) {
        const scrobbleIds = data.map(s => s.id);
        const likedIds = await checkLikedScrobbles(spotifyId, scrobbleIds);
        setLikedScrobbleIds(likedIds);
      }
    } catch (error) {
      console.error('Error processing scrobbles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [spotifyId]);

  const handleLike = useCallback(async (scrobble: Scrobble) => {
    if (!spotifyId) return;

    // Optimistic UI: update immediately
    setLikedScrobbleIds(prev => new Set([...prev, scrobble.id]));

    try {
      await likeScrobble(scrobble, {
        odl: spotifyId,
        name: user?.name || 'User',
        avatar: avatarUrl || undefined
      });

      // Cross-like sync: Notka → Spotify
      if (scrobble.trackId) {
        try {
          const currentUser = await getUser(spotifyId);
          if (currentUser?.crossLikeEnabled &&
              (currentUser.crossLikeMode === 'notka_to_spotify' || currentUser.crossLikeMode === 'both')) {
            const success = await addTrackToSpotifyLikes(scrobble.trackId);
            if (success) {
              console.log('🔄 Auto-liked in Spotify (Notka sync)');
            }
          }
        } catch (err) {
          console.error('Cross-like sync error:', err);
        }
      }

      showSuccess(t.liked);
    } catch (error) {
      // Rollback on error
      setLikedScrobbleIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(scrobble.id);
        return newSet;
      });
      showError(t.failedToLike);
    }
  }, [spotifyId, user?.name, avatarUrl, t]);

  const handleUnlike = useCallback(async (scrobbleId: string) => {
    if (!spotifyId) return;

    // Find scrobble to get trackId for Spotify sync
    const scrobble = scrobbles.find(s => s.id === scrobbleId);

    // Optimistic UI: update immediately
    setLikedScrobbleIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(scrobbleId);
      return newSet;
    });

    try {
      await unlikeScrobble(spotifyId, scrobbleId);

      // Cross-like sync: Notka → Spotify (unlike)
      if (scrobble?.trackId) {
        try {
          const currentUser = await getUser(spotifyId);
          if (currentUser?.crossLikeEnabled &&
              (currentUser.crossLikeMode === 'notka_to_spotify' || currentUser.crossLikeMode === 'both')) {
            const success = await removeTrackFromSpotifyLikes(scrobble.trackId);
            if (success) {
              console.log('🔄 Auto-unliked in Spotify (Notka sync)');
            }
          }
        } catch (err) {
          console.error('Cross-unlike sync error:', err);
        }
      }
    } catch (error) {
      // Rollback on error
      setLikedScrobbleIds(prev => new Set([...prev, scrobbleId]));
      showError(t.failedToUnlike);
    }
  }, [spotifyId, scrobbles, t]);

  // Like currently playing track
  const handleNowPlayingLike = useCallback(async () => {
    if (!spotifyId || !currentlyPlaying?.item) return;

    const track = currentlyPlaying.item;

    // First check if there's already a scrobble for this track
    const existingScrobble = scrobbles.find(s => s.trackId === track.id);

    if (existingScrobble) {
      // Like the existing scrobble
      await likeScrobble(existingScrobble, {
        odl: spotifyId,
        name: user?.name || 'User',
        avatar: avatarUrl || undefined
      });
      setLikedScrobbleIds(prev => new Set([...prev, existingScrobble.id]));
    } else {
      // Create a pseudo-scrobble with consistent ID (no timestamp)
      const pseudoScrobbleId = `now_${spotifyId}_${track.id}`;
      const pseudoScrobble: Scrobble = {
        id: pseudoScrobbleId,
        odl: spotifyId,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        trackId: track.id,
        artistId: track.artists[0]?.id,
        albumArtURL: track.album.images[0]?.url,
        timestamp: new Date()
      };

      await likeScrobble(pseudoScrobble, {
        odl: spotifyId,
        name: user?.name || 'User',
        avatar: avatarUrl || undefined
      });
      setLikedScrobbleIds(prev => new Set([...prev, pseudoScrobbleId]));
    }

    // Cross-like sync: Notka → Spotify
    try {
      const currentUser = await getUser(spotifyId);
      if (currentUser?.crossLikeEnabled &&
          (currentUser.crossLikeMode === 'notka_to_spotify' || currentUser.crossLikeMode === 'both')) {
        const success = await addTrackToSpotifyLikes(track.id);
        if (success) {
          console.log('🔄 Auto-liked in Spotify (Now Playing sync)');
        }
      }
    } catch (err) {
      console.error('Cross-like sync error:', err);
    }

    setNowPlayingLiked(true);
  }, [spotifyId, currentlyPlaying?.item, user?.name, avatarUrl, scrobbles]);

  const handleNowPlayingUnlike = useCallback(async () => {
    if (!spotifyId || !currentlyPlaying?.item) return;

    const trackId = currentlyPlaying.item.id;

    // Try to find existing scrobble first
    const existingScrobble = scrobbles.find(s => s.trackId === trackId);

    if (existingScrobble) {
      await unlikeScrobble(spotifyId, existingScrobble.id);
      setLikedScrobbleIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(existingScrobble.id);
        return newSet;
      });
    } else {
      // Try pseudo-scrobble ID
      const pseudoScrobbleId = `now_${spotifyId}_${trackId}`;
      await unlikeScrobble(spotifyId, pseudoScrobbleId);
      setLikedScrobbleIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(pseudoScrobbleId);
        return newSet;
      });
    }

    // Cross-like sync: Notka → Spotify (unlike)
    try {
      const currentUser = await getUser(spotifyId);
      if (currentUser?.crossLikeEnabled &&
          (currentUser.crossLikeMode === 'notka_to_spotify' || currentUser.crossLikeMode === 'both')) {
        const success = await removeTrackFromSpotifyLikes(trackId);
        if (success) {
          console.log('🔄 Auto-unliked in Spotify (Now Playing sync)');
        }
      }
    } catch (err) {
      console.error('Cross-unlike sync error:', err);
    }

    setNowPlayingLiked(false);
  }, [spotifyId, currentlyPlaying?.item, scrobbles]);

  // Check if scrobble is "live" (less than 1 minute old)
  const isScrobbleLive = (timestamp: Date): boolean => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    return diff < 60000; // 60000ms = 1 minute
  };

  const renderEmptyState = () => {
    if (activeTab === 'following') {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p>{t.noFollowingScrobbles}</p>
          <p style={{ fontSize: 14, marginTop: 8, opacity: 0.7 }}>
            {t.followSomeone}
          </p>
        </div>
      );
    }

    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎵</div>
        <p>{t.noScrobbles}</p>
      </div>
    );
  };

  return (
    <div className="feed-page">
      <div className="feed-sticky-header">
        <NowPlaying
          currentlyPlaying={currentlyPlaying}
          isLoading={isScrobblerLoading}
          isLiked={nowPlayingLiked}
          onLike={handleNowPlayingLike}
          onUnlike={handleNowPlayingUnlike}
          canLike={!!spotifyId && !!currentlyPlaying?.item}
        />

        <div className="feed-tabs">
          <TabProvider value={activeTab} onUpdate={(val) => setActiveTab(val as TabId)}>
            <TabList>
              <Tab value="all">{t.allScrobbles}</Tab>
              <Tab value="following">{t.followingTab}</Tab>
            </TabList>
          </TabProvider>
        </div>
      </div>

      <div className="feed-content">
        {isLoading ? (
          <div className="feed">
            <ScrobbleCardSkeletonList count={5} />
          </div>
        ) : scrobbles.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="feed">
            {scrobbles.map((scrobble) => {
              const isOwnScrobble = scrobble.odl === spotifyId;
              return (
                <ScrobbleCard
                  key={scrobble.id}
                  scrobble={scrobble}
                  user={usersMap.get(scrobble.odl)}
                  timeAgo={formatTimeI18n(scrobble.timestamp, t)}
                  showUser={true}
                  isLiked={likedScrobbleIds.has(scrobble.id)}
                  onLike={() => handleLike(scrobble)}
                  onUnlike={() => handleUnlike(scrobble.id)}
                  canLike={!!spotifyId}
                  lang={lang}
                  showSpotifyLiked={isOwnScrobble}
                  showLiveBadge={isScrobbleLive(scrobble.timestamp)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
