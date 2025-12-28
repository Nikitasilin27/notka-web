import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Switch, Button, RadioGroup, Radio, Disclosure } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { Moon, Sun, Globe, PersonPlus, PersonXmark, ChevronRight } from '@gravity-ui/icons';
import { 
  getUser, 
  getUserScrobbles, 
  isFollowing, 
  followUser, 
  unfollowUser,
  getFollowCounts 
} from '../services/firebase';
import { getArtistImages } from '../services/spotify';
import { User, Scrobble } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useI18n, formatTimeI18n, Language } from '../hooks/useI18n';
import { ScrobbleCard } from '../components/ScrobbleCard';

interface TopArtist {
  name: string;
  count: number;
  imageUrl?: string;
}

export function ProfilePage() {
  const { odl } = useParams<{ odl: string }>();
  const { spotifyId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [allScrobbles, setAllScrobbles] = useState<Scrobble[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showAllScrobbles, setShowAllScrobbles] = useState(false);

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
        getUserScrobbles(targetOdl, 100),
        getFollowCounts(targetOdl)
      ]);
      
      setUser(userData);
      setAllScrobbles(scrobblesData);
      setScrobbles(scrobblesData.slice(0, 10));
      setFollowCounts(counts);
      
      // Calculate top artists
      const artistMap = new Map<string, { count: number; albumArtUrl?: string }>();
      scrobblesData.forEach(scrobble => {
        const existing = artistMap.get(scrobble.artist);
        if (existing) {
          existing.count++;
        } else {
          artistMap.set(scrobble.artist, {
            count: 1,
            albumArtUrl: scrobble.albumArtURL
          });
        }
      });
      
      const topArtistsList = Array.from(artistMap.entries())
        .map(([name, data]) => ({ name, count: data.count, imageUrl: data.albumArtUrl }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      
      setTopArtists(topArtistsList);
      
      // Fetch artist images from Spotify (async, will update state when done)
      const artistNames = topArtistsList.map(a => a.name);
      getArtistImages(artistNames).then(imageMap => {
        setTopArtists(prev => prev.map(artist => ({
          ...artist,
          imageUrl: imageMap.get(artist.name) || artist.imageUrl
        })));
      });
      
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

  const lastScrobble = scrobbles.length > 0 ? scrobbles[0] : null;
  
  const stats = {
    scrobbles: allScrobbles.length,
    artists: new Set(allScrobbles.map(s => s.artist)).size,
    tracks: new Set(allScrobbles.map(s => `${s.artist}-${s.title}`)).size
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

      {/* Main content - Two columns like Last.fm */}
      <div className="profile-content">
        {/* Left column - Recent tracks */}
        <div className="profile-main">
          <div className="section">
            <h2 className="section-title">{t.recentTracks}</h2>
            
            {scrobbles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎧</div>
                <p>{isOwnProfile ? t.turnOnSpotify : t.noScrobbles}</p>
              </div>
            ) : (
              <>
                <div className="feed">
                  {(showAllScrobbles ? allScrobbles : scrobbles).map((scrobble) => (
                    <ScrobbleCard
                      key={scrobble.id}
                      scrobble={scrobble}
                      timeAgo={formatTimeI18n(scrobble.timestamp, t)}
                      showUser={false}
                    />
                  ))}
                </div>
                
                {allScrobbles.length > 10 && !showAllScrobbles && (
                  <Button
                    view="flat"
                    size="l"
                    width="max"
                    onClick={() => setShowAllScrobbles(true)}
                    className="show-more-button"
                  >
                    {lang === 'ru' ? 'Показать больше' : 'Show more'}
                    <Icon data={ChevronRight} size={16} />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Settings for own profile */}
          {isOwnProfile && (
            <div className="section">
              <h2 className="section-title">{t.settings}</h2>
              <div className="settings-list">
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
                
                <Disclosure
                  className="language-disclosure"
                  summary={
                    <div className="settings-item-info">
                      <Icon data={Globe} size={20} />
                      <span>{t.language}</span>
                    </div>
                  }
                >
                  <div className="language-selector">
                    <RadioGroup
                      value={lang}
                      onUpdate={(value) => setLang(value as Language)}
                      direction="vertical"
                    >
                      <Radio value="ru">
                        <div className="language-option">
                          <span className="language-name">Русский</span>
                          <span className="language-native">Russian</span>
                        </div>
                      </Radio>
                      <Radio value="en">
                        <div className="language-option">
                          <span className="language-name">English</span>
                          <span className="language-native">English</span>
                        </div>
                      </Radio>
                    </RadioGroup>
                  </div>
                </Disclosure>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Top artists */}
        <div className="profile-sidebar">
          {topArtists.length > 0 && (
            <div className="top-artists-section">
              <h3 className="top-artists-title">
                {lang === 'ru' ? 'Топ исполнители' : 'Top Artists'}
              </h3>
              <div className="top-artists-grid">
                {topArtists.map((artist) => (
                  <div key={artist.name} className="top-artist-tile">
                    {artist.imageUrl ? (
                      <img 
                        src={artist.imageUrl} 
                        alt={artist.name}
                        className="top-artist-tile-image"
                      />
                    ) : (
                      <div className="top-artist-tile-image top-artist-tile-placeholder">
                        🎵
                      </div>
                    )}
                    <div className="top-artist-tile-overlay">
                      <div className="top-artist-tile-name">{artist.name}</div>
                      <div className="top-artist-tile-count">
                        {artist.count} {lang === 'ru' 
                          ? (artist.count === 1 ? 'прослушивание' : 'прослушиваний')
                          : (artist.count === 1 ? 'play' : 'plays')
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
