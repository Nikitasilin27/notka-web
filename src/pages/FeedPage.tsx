import { useState, useEffect, useCallback } from 'react';
import { Loader, TabProvider, TabList, Tab } from '@gravity-ui/uikit';
import { useAuth } from '../hooks/useAuth';
import { useScrobbler } from '../hooks/useScrobbler';
import { useI18n, formatTimeI18n } from '../hooks/useI18n';
import { 
  getRecentScrobbles, 
  getUserScrobbles, 
  getFollowingScrobbles, 
  getUser,
  likeScrobble,
  unlikeScrobble,
  checkLikedScrobbles
} from '../services/firebase';
import { Scrobble, User } from '../types';
import { NowPlaying } from '../components/NowPlaying';
import { ScrobbleCard } from '../components/ScrobbleCard';

type TabId = 'all' | 'following' | 'my';

export function FeedPage() {
  const { spotifyId, user, avatarUrl } = useAuth();
  const { currentlyPlaying, isLoading: isScrobblerLoading } = useScrobbler();
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const [likedScrobbleIds, setLikedScrobbleIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [nowPlayingLiked, setNowPlayingLiked] = useState(false);

  useEffect(() => {
    loadScrobbles();
    const interval = setInterval(loadScrobbles, 30000);
    return () => clearInterval(interval);
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

  const loadScrobbles = async () => {
    try {
      let data: Scrobble[] = [];
      
      if (activeTab === 'all') {
        data = await getRecentScrobbles(50);
      } else if (activeTab === 'following' && spotifyId) {
        data = await getFollowingScrobbles(spotifyId, 50);
      } else if (activeTab === 'my' && spotifyId) {
        data = await getUserScrobbles(spotifyId, 50);
      }
      
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
      console.error('Error loading scrobbles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = useCallback(async (scrobble: Scrobble) => {
    if (!spotifyId) return;
    
    await likeScrobble(scrobble, {
      odl: spotifyId,
      name: user?.name || 'User',
      avatar: avatarUrl || undefined
    });
    
    setLikedScrobbleIds(prev => new Set([...prev, scrobble.id]));
  }, [spotifyId, user?.name, avatarUrl]);

  const handleUnlike = useCallback(async (scrobbleId: string) => {
    if (!spotifyId) return;
    
    await unlikeScrobble(spotifyId, scrobbleId);
    
    setLikedScrobbleIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(scrobbleId);
      return newSet;
    });
  }, [spotifyId]);

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
    
    setNowPlayingLiked(false);
  }, [spotifyId, currentlyPlaying?.item, scrobbles]);

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
    
    if (activeTab === 'my') {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">🎧</div>
          <p>{t.turnOnSpotify}</p>
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
              <Tab value="my">{t.profile}</Tab>
            </TabList>
          </TabProvider>
        </div>
      </div>

      <div className="feed-content">
        {isLoading ? (
          <div className="loading-container">
            <Loader size="l" />
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
                  showUser={activeTab !== 'my'}
                  isLiked={likedScrobbleIds.has(scrobble.id)}
                  onLike={() => handleLike(scrobble)}
                  onUnlike={() => handleUnlike(scrobble.id)}
                  canLike={!!spotifyId}
                  lang={lang}
                  showSpotifyLiked={isOwnScrobble}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
