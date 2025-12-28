import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Button, Dialog } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { PersonPlus, PersonXmark, ChevronRight } from '@gravity-ui/icons';
import { 
  getUser, 
  getUserScrobbles, 
  isFollowing, 
  followUser, 
  unfollowUser,
  getFollowCounts 
} from '../services/firebase';
import { getArtistImages } from '../services/spotify';
import { getArtistWikipediaInfo, WikipediaArtistInfo } from '../services/wikipedia';
import { User, Scrobble } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useI18n, formatTimeI18n } from '../hooks/useI18n';
import { ScrobbleCard } from '../components/ScrobbleCard';

interface TopArtist {
  name: string;
  count: number;
  imageUrl?: string;
}

// Normalize artist name - take only first artist (before comma or feat)
function normalizeArtistName(artist: string): string {
  // Remove feat., ft., featuring, &, etc.
  const separators = [',', ' feat.', ' feat ', ' ft.', ' ft ', ' featuring ', ' & ', ' x ', ' X '];
  let name = artist;
  
  for (const sep of separators) {
    const idx = name.toLowerCase().indexOf(sep.toLowerCase());
    if (idx > 0) {
      name = name.substring(0, idx);
    }
  }
  
  return name.trim();
}

export function ProfilePage() {
  const { odl } = useParams<{ odl: string }>();
  const { spotifyId } = useAuth();
  const { t, lang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [allScrobbles, setAllScrobbles] = useState<Scrobble[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showAllScrobbles, setShowAllScrobbles] = useState(false);
  
  // Artist dialog state
  const [selectedArtist, setSelectedArtist] = useState<TopArtist | null>(null);
  const [artistInfo, setArtistInfo] = useState<WikipediaArtistInfo | null>(null);
  const [isArtistInfoLoading, setIsArtistInfoLoading] = useState(false);

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
      
      // Calculate top artists with normalized names
      const artistMap = new Map<string, { count: number; albumArtUrl?: string }>();
      scrobblesData.forEach(scrobble => {
        const normalizedName = normalizeArtistName(scrobble.artist);
        const existing = artistMap.get(normalizedName);
        if (existing) {
          existing.count++;
        } else {
          artistMap.set(normalizedName, {
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
      
      // Fetch artist images from Spotify
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

  const handleArtistClick = async (artist: TopArtist) => {
    setSelectedArtist(artist);
    setArtistInfo(null);
    setIsArtistInfoLoading(true);
    
    const info = await getArtistWikipediaInfo(artist.name);
    setArtistInfo(info);
    setIsArtistInfoLoading(false);
  };

  const closeArtistDialog = () => {
    setSelectedArtist(null);
    setArtistInfo(null);
  };

  const lastScrobble = scrobbles.length > 0 ? scrobbles[0] : null;
  
  const stats = {
    scrobbles: allScrobbles.length,
    artists: new Set(allScrobbles.map(s => normalizeArtistName(s.artist))).size,
    tracks: new Set(allScrobbles.map(s => `${normalizeArtistName(s.artist)}-${s.title}`)).size
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
                  <div 
                    key={artist.name} 
                    className="top-artist-tile"
                    onClick={() => handleArtistClick(artist)}
                  >
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

      {/* Artist Info Dialog */}
      <Dialog
        open={!!selectedArtist}
        onClose={closeArtistDialog}
        size="m"
      >
        <Dialog.Header
          caption={selectedArtist?.name || ''}
          insertBefore={
            selectedArtist?.imageUrl ? (
              <img 
                src={selectedArtist.imageUrl} 
                alt="" 
                className="artist-dialog-avatar"
              />
            ) : undefined
          }
        />
        <Dialog.Body>
          {isArtistInfoLoading ? (
            <div className="artist-dialog-loading">
              <Loader size="m" />
            </div>
          ) : artistInfo ? (
            <div className="artist-dialog-content">
              <p className="artist-dialog-extract">{artistInfo.extract}</p>
              {artistInfo.content_urls?.desktop.page && (
                <a 
                  href={artistInfo.content_urls.desktop.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="artist-dialog-link"
                >
                  {lang === 'ru' ? 'Читать на Wikipedia' : 'Read on Wikipedia'} →
                </a>
              )}
            </div>
          ) : (
            <div className="artist-dialog-empty">
              <p>
                {lang === 'ru' 
                  ? 'Информация об исполнителе не найдена'
                  : 'Artist information not found'
                }
              </p>
            </div>
          )}
        </Dialog.Body>
        <Dialog.Footer
          textButtonCancel={lang === 'ru' ? 'Закрыть' : 'Close'}
          onClickButtonCancel={closeArtistDialog}
        />
      </Dialog>
    </div>
  );
}
