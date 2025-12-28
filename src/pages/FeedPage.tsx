import { useState, useEffect } from 'react';
import { Loader, TabProvider, TabList, Tab } from '@gravity-ui/uikit';
import { useAuth } from '../hooks/useAuth';
import { useScrobbler } from '../hooks/useScrobbler';
import { useI18n, formatTimeI18n } from '../hooks/useI18n';
import { getRecentScrobbles, getUserScrobbles, getFollowingScrobbles, getUser } from '../services/firebase';
import { Scrobble, User } from '../types';
import { NowPlaying } from '../components/NowPlaying';
import { ScrobbleCard } from '../components/ScrobbleCard';

type TabId = 'all' | 'following' | 'my';

export function FeedPage() {
  const { spotifyId } = useAuth();
  const { currentlyPlaying } = useScrobbler();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScrobbles();
    const interval = setInterval(loadScrobbles, 30000);
    return () => clearInterval(interval);
  }, [activeTab, spotifyId]);

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
    } catch (error) {
      console.error('Error loading scrobbles:', error);
    } finally {
      setIsLoading(false);
    }
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
        <NowPlaying currentlyPlaying={currentlyPlaying} />
        
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
            {scrobbles.map((scrobble) => (
              <ScrobbleCard
                key={scrobble.id}
                scrobble={scrobble}
                user={usersMap.get(scrobble.odl)}
                timeAgo={formatTimeI18n(scrobble.timestamp, t)}
                showUser={activeTab !== 'my'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
