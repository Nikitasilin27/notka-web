import { useState, useEffect } from 'react';
import { Loader, RadioGroup } from '@gravity-ui/uikit';
import { useAuth } from '../hooks/useAuth';
import { useScrobbler } from '../hooks/useScrobbler';
import { getRecentScrobbles, getUserScrobbles, getUser } from '../services/firebase';
import { Scrobble, User } from '../types';
import { NowPlaying } from '../components/NowPlaying';
import { ScrobbleCard } from '../components/ScrobbleCard';

type TabId = 'all' | 'my';

export function FeedPage() {
  const { spotifyId } = useAuth();
  const { currentlyPlaying } = useScrobbler();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScrobbles();
    const interval = setInterval(loadScrobbles, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [activeTab, spotifyId]);

  const loadScrobbles = async () => {
    try {
      const data = activeTab === 'all' 
        ? await getRecentScrobbles(50)
        : spotifyId ? await getUserScrobbles(spotifyId, 50) : [];
      
      setScrobbles(data);

      // Load user info for all scrobbles
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

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} д назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="feed-page">
      <NowPlaying currentlyPlaying={currentlyPlaying} />
      
      <div className="feed-tabs">
        <RadioGroup
          value={activeTab}
          onUpdate={(value: string) => setActiveTab(value as TabId)}
          options={[
            { value: 'all', content: 'Все скробблы' },
            { value: 'my', content: 'Мои скробблы' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="loading-container">
          <Loader size="l" />
        </div>
      ) : scrobbles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎧</div>
          <p>
            {activeTab === 'my' 
              ? 'У тебя пока нет скробблов. Включи музыку в Spotify!' 
              : 'Пока никто ничего не слушает'}
          </p>
        </div>
      ) : (
        <div className="feed">
          {scrobbles.map((scrobble) => (
            <ScrobbleCard
              key={scrobble.id}
              scrobble={scrobble}
              user={usersMap.get(scrobble.odl)}
              timeAgo={formatTime(scrobble.timestamp)}
              showUser={activeTab === 'all'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
