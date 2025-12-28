import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Switch, Button, RadioGroup, Radio } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { Moon, Sun, Globe, PersonPlus, PersonXmark } from '@gravity-ui/icons';
import { 
  getUser, 
  getUserScrobbles, 
  isFollowing, 
  followUser, 
  unfollowUser,
  getFollowCounts 
} from '../services/firebase';
import { User, Scrobble } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useI18n, formatTimeI18n, Language } from '../hooks/useI18n';
import { ScrobbleCard } from '../components/ScrobbleCard';

export function ProfilePage() {
  const { odl } = useParams<{ odl: string }>();
  const { spotifyId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const isOwnProfile = odl === spotifyId || !odl;
  const targetOdl = odl || spotifyId;

  useEffect(() => {
    if (!targetOdl) return;
    loadProfile();
  }, [targetOdl, spotifyId]);

  const loadProfile = async () => {
    if (!targetOdl) return;
    
    try {
      const [userData, scrobblesData, counts] = await Promise.all([
        getUser(targetOdl),
        getUserScrobbles(targetOdl, 30),
        getFollowCounts(targetOdl)
      ]);
      
      setUser(userData);
      setScrobbles(scrobblesData);
      setFollowCounts(counts);
      
      // Check if current user follows this profile
      if (spotifyId && targetOdl && spotifyId !== targetOdl) {
        const following = await isFollowing(spotifyId, targetOdl);
        setFollowStatus(following);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!spotifyId || !targetOdl || isFollowLoading) return;
    
    setIsFollowLoading(true);
    try {
      if (followStatus) {
        await unfollowUser(spotifyId, targetOdl);
        setFollowStatus(false);
        setFollowCounts(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await followUser(spotifyId, targetOdl);
        setFollowStatus(true);
        setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsFollowLoading(false);
    }
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
        <p>{t.userNotFound}</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Hero Header */}
      <div className="profile-hero">
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
            <div className="profile-hero-name-row">
              <h1 className="profile-hero-name">{user.name}</h1>
              
              {!isOwnProfile && (
                <Button
                  view={followStatus ? 'outlined' : 'action'}
                  size="m"
                  loading={isFollowLoading}
                  onClick={handleFollowToggle}
                >
                  <Icon data={followStatus ? PersonXmark : PersonPlus} size={16} />
                  {followStatus ? t.unfollow : t.follow}
                </Button>
              )}
            </div>
            
            {lastScrobble && (
              <div className="profile-hero-listening">
                {lastScrobble.title} — {lastScrobble.artist}
                <span className="profile-hero-time">{formatTimeI18n(lastScrobble.timestamp, t)}</span>
              </div>
            )}
            
            <div className="profile-hero-stats">
              <div className="profile-hero-stat">
                <div className="profile-hero-stat-value">{stats.scrobbles}</div>
                <div className="profile-hero-stat-label">{t.scrobbles}</div>
              </div>
              <div className="profile-hero-stat">
                <div className="profile-hero-stat-value">{followCounts.followers}</div>
                <div className="profile-hero-stat-label">{t.followers}</div>
              </div>
              <div className="profile-hero-stat">
                <div className="profile-hero-stat-value">{followCounts.following}</div>
                <div className="profile-hero-stat-label">{t.followingCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings section for own profile */}
      {isOwnProfile && (
        <div className="section">
          <h2 className="section-title">{t.settings}</h2>
          <div className="settings-list">
            {/* Theme toggle */}
            <div className="settings-item">
              <div className="settings-item-info">
                <Icon data={theme === 'dark' ? Moon : Sun} size={20} />
                <span>{t.darkTheme}</span>
              </div>
              <Switch
                checked={theme === 'dark'}
                onUpdate={toggleTheme}
                size="m"
              />
            </div>
            
            {/* Language selector */}
            <div className="settings-item settings-item-column">
              <div className="settings-item-info">
                <Icon data={Globe} size={20} />
                <span>{t.language}</span>
              </div>
              <div className="language-selector">
                <RadioGroup
                  value={lang}
                  onUpdate={(value) => setLang(value as Language)}
                  direction="vertical"
                >
                  <Radio value="ru">
                    <div className="language-option">
                      <span className="language-name">{t.russian}</span>
                      <span className="language-native">Русский</span>
                    </div>
                  </Radio>
                  <Radio value="en">
                    <div className="language-option">
                      <span className="language-name">{t.english}</span>
                      <span className="language-native">English</span>
                    </div>
                  </Radio>
                </RadioGroup>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent tracks */}
      <div className="section">
        <h2 className="section-title">{t.recentTracks}</h2>
        
        {scrobbles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎧</div>
            <p>{isOwnProfile ? t.turnOnSpotify : t.noScrobbles}</p>
          </div>
        ) : (
          <div className="feed">
            {scrobbles.map((scrobble) => (
              <ScrobbleCard
                key={scrobble.id}
                scrobble={scrobble}
                timeAgo={formatTimeI18n(scrobble.timestamp, t)}
                showUser={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
