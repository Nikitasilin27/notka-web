import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Switch } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { Moon, Sun } from '@gravity-ui/icons';
import { getUser, getUserScrobbles } from '../services/firebase';
import { User, Scrobble } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ScrobbleCard } from '../components/ScrobbleCard';

export function ProfilePage() {
  const { odl } = useParams<{ odl: string }>();
  const { spotifyId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = odl === spotifyId || !odl;
  const targetOdl = odl || spotifyId;

  useEffect(() => {
    if (!targetOdl) return;
    loadProfile();
  }, [targetOdl]);

  const loadProfile = async () => {
    if (!targetOdl) return;
    
    try {
      const [userData, scrobblesData] = await Promise.all([
        getUser(targetOdl),
        getUserScrobbles(targetOdl, 30)
      ]);
      setUser(userData);
      setScrobbles(scrobblesData);
    } catch (error) {
      console.error('Error loading profile:', error);
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

  // Check if currentTrack is recent (within last 5 minutes)
  const isCurrentlyPlaying = () => {
    // No currentTrack data
    if (!user?.currentTrack) return false;
    
    // Check if currentTrack has actual data (not empty)
    if (!user.currentTrack.trackName || !user.currentTrack.artistName) return false;
    
    // No lastUpdated timestamp
    if (!user?.lastUpdated) return false;
    
    // Parse lastUpdated from different formats
    let lastUpdatedDate: Date;
    try {
      if (user.lastUpdated instanceof Date) {
        lastUpdatedDate = user.lastUpdated;
      } else if (typeof user.lastUpdated === 'object' && 'seconds' in user.lastUpdated) {
        // Firebase Timestamp
        lastUpdatedDate = new Date((user.lastUpdated as any).seconds * 1000);
      } else if (typeof user.lastUpdated === 'string') {
        lastUpdatedDate = new Date(user.lastUpdated);
      } else if (typeof user.lastUpdated === 'number') {
        lastUpdatedDate = new Date(user.lastUpdated);
      } else {
        return false;
      }
    } catch {
      return false;
    }
    
    // Check if within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUpdatedDate > fiveMinutesAgo;
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <Loader size="l" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">😕</div>
        <p>Пользователь не найден</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <img 
          src={user.avatarURL || '/default-avatar.png'} 
          alt={user.name}
          className="profile-avatar"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23333"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">👤</text></svg>';
          }}
        />
        <div className="profile-info">
          <h1 className="profile-name">{user.name}</h1>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          
          {isCurrentlyPlaying() && user.currentTrack && (
            <div className="profile-listening">
              <span className="now-playing-pulse" />
              {user.currentTrack.trackName} — {user.currentTrack.artistName}
            </div>
          )}
          
          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-value">{scrobbles.length}</div>
              <div className="profile-stat-label">скробблов</div>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div className="section">
          <h2 className="section-title">Настройки</h2>
          <div className="settings-list">
            <div className="settings-item">
              <div className="settings-item-info">
                <Icon data={theme === 'dark' ? Moon : Sun} size={20} />
                <span>Тёмная тема</span>
              </div>
              <Switch
                checked={theme === 'dark'}
                onUpdate={toggleTheme}
                size="m"
              />
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <h2 className="section-title">История прослушиваний</h2>
        
        {scrobbles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎧</div>
            <p>{isOwnProfile ? 'Включи музыку в Spotify!' : 'Нет скробблов'}</p>
          </div>
        ) : (
          <div className="feed">
            {scrobbles.map((scrobble) => (
              <ScrobbleCard
                key={scrobble.id}
                scrobble={scrobble}
                timeAgo={formatTime(scrobble.timestamp)}
                showUser={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
