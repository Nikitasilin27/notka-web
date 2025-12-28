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

  // Calculate stats
  const getStats = () => {
    const uniqueArtists = new Set(scrobbles.map(s => s.artist)).size;
    const uniqueTracks = new Set(scrobbles.map(s => `${s.artist}-${s.title}`)).size;
    return {
      scrobbles: scrobbles.length,
      artists: uniqueArtists,
      tracks: uniqueTracks
    };
  };

  const stats = getStats();

  // Get last scrobble for "now playing" style display
  const lastScrobble = scrobbles.length > 0 ? scrobbles[0] : null;

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
      {/* Hero Header like Last.fm */}
      <div className="profile-hero">
        {/* Background blur from last track */}
        {lastScrobble?.albumArtURL && (
          <div 
            className="profile-hero-bg"
            style={{ backgroundImage: `url(${lastScrobble.albumArtURL})` }}
          />
        )}
        
        <div className="profile-hero-content">
          <img 
            src={user.avatarURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23555"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">👤</text></svg>'} 
            alt={user.name}
            className="profile-hero-avatar"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23555"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">👤</text></svg>';
            }}
          />
          
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">{user.name}</h1>
            
            {lastScrobble && (
              <div className="profile-hero-listening">
                {lastScrobble.title} — {lastScrobble.artist}
                <span className="profile-hero-time">{formatTime(lastScrobble.timestamp)}</span>
              </div>
            )}
            
            <div className="profile-hero-stats">
              <div className="profile-hero-stat">
                <div className="profile-hero-stat-value">{stats.scrobbles}</div>
                <div className="profile-hero-stat-label">скробблов</div>
              </div>
              <div className="profile-hero-stat">
                <div className="profile-hero-stat-value">{stats.artists}</div>
                <div className="profile-hero-stat-label">исполнителей</div>
              </div>
              <div className="profile-hero-stat">
                <div className="profile-hero-stat-value">{stats.tracks}</div>
                <div className="profile-hero-stat-label">треков</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings section for own profile */}
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

      {/* Recent tracks */}
      <div className="section">
        <h2 className="section-title">Последние треки</h2>
        
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
