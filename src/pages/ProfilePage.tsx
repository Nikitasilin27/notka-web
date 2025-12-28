import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Button, Dialog, Pagination, Avatar, Progress } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { PersonPlus, PersonXmark, ChevronRight, ChevronUp } from '@gravity-ui/icons';
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

interface TopAlbum {
  name: string;
  artist: string;
  count: number;
  imageUrl?: string;
}

interface MusicMatch {
  percentage: number;
  level: 'low' | 'medium' | 'high' | 'super';
  commonArtists: TopArtist[];
  recommendations: TopArtist[];
}

// Normalize artist name - take only first artist (before comma or feat)
function normalizeArtistName(artist: string): string {
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

const TRACKS_PER_PAGE = 10;

export function ProfilePage() {
  const { odl } = useParams<{ odl: string }>();
  const { spotifyId, avatarUrl } = useAuth();
  const { t, lang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [scrobbles, setScrobbles] = useState<Scrobble[]>([]);
  const [allScrobbles, setAllScrobbles] = useState<Scrobble[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [topAlbums, setTopAlbums] = useState<TopAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Pagination state
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Artist dialog state
  const [selectedArtist, setSelectedArtist] = useState<TopArtist | null>(null);
  const [artistInfo, setArtistInfo] = useState<WikipediaArtistInfo | null>(null);
  const [artistTracks, setArtistTracks] = useState<Scrobble[]>([]);
  const [isArtistInfoLoading, setIsArtistInfoLoading] = useState(false);
  
  // Music match state
  const [musicMatch, setMusicMatch] = useState<MusicMatch | null>(null);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);

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
      
      // Calculate top albums
      const albumMap = new Map<string, { artist: string; count: number; imageUrl?: string }>();
      scrobblesData.forEach(scrobble => {
        const key = `${scrobble.album}|||${normalizeArtistName(scrobble.artist)}`;
        const existing = albumMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          albumMap.set(key, {
            artist: normalizeArtistName(scrobble.artist),
            count: 1,
            imageUrl: scrobble.albumArtURL
          });
        }
      });
      
      const topAlbumsList = Array.from(albumMap.entries())
        .map(([key, data]) => ({
          name: key.split('|||')[0],
          artist: data.artist,
          count: data.count,
          imageUrl: data.imageUrl
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      
      setTopAlbums(topAlbumsList);
      
      // Fetch artist images from Spotify
      const artistNames = topArtistsList.map(a => a.name);
      getArtistImages(artistNames).then(imageMap => {
        setTopArtists(prev => prev.map(artist => ({
          ...artist,
          imageUrl: imageMap.get(artist.name) || artist.imageUrl
        })));
      });
      
      // Load music match for other profiles
      if (spotifyId && targetOdl && spotifyId !== targetOdl) {
        const following = await isFollowing(spotifyId, targetOdl);
        setFollowStatus(following);
        
        // Get my scrobbles for comparison
        const myData = await getUserScrobbles(spotifyId, 100);
        
        // Calculate match
        const match = calculateMusicMatch(myData, scrobblesData, topArtistsList);
        setMusicMatch(match);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMusicMatch = (
    myScrobbles: Scrobble[], 
    theirScrobbles: Scrobble[],
    theirTopArtists: TopArtist[]
  ): MusicMatch => {
    // Get my artists
    const myArtists = new Set<string>();
    const myArtistCounts = new Map<string, number>();
    myScrobbles.forEach(s => {
      const name = normalizeArtistName(s.artist);
      myArtists.add(name);
      myArtistCounts.set(name, (myArtistCounts.get(name) || 0) + 1);
    });
    
    // Get their artists
    const theirArtists = new Set<string>();
    theirScrobbles.forEach(s => {
      theirArtists.add(normalizeArtistName(s.artist));
    });
    
    // Find common artists
    const commonArtistNames = [...myArtists].filter(a => theirArtists.has(a));
    
    // Get common artists with images from their top list
    const commonArtists: TopArtist[] = commonArtistNames
      .map(name => {
        const fromTop = theirTopArtists.find(a => a.name === name);
        return {
          name,
          count: myArtistCounts.get(name) || 0,
          imageUrl: fromTop?.imageUrl
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Get recommendations (their artists I don't listen to)
    const recommendations: TopArtist[] = theirTopArtists
      .filter(a => !myArtists.has(a.name))
      .slice(0, 6);
    
    // Calculate percentage
    const totalUnique = new Set([...myArtists, ...theirArtists]).size;
    const percentage = totalUnique > 0 
      ? Math.round((commonArtistNames.length / totalUnique) * 100)
      : 0;
    
    // Determine level
    let level: 'low' | 'medium' | 'high' | 'super';
    if (percentage >= 50) level = 'super';
    else if (percentage >= 30) level = 'high';
    else if (percentage >= 15) level = 'medium';
    else level = 'low';
    
    return { percentage, level, commonArtists, recommendations };
  };

  const getMatchLevelText = (level: string) => {
    const texts = {
      low: lang === 'ru' ? 'низкая' : 'low',
      medium: lang === 'ru' ? 'средняя' : 'medium',
      high: lang === 'ru' ? 'высокая' : 'high',
      super: lang === 'ru' ? 'супер' : 'super'
    };
    return texts[level as keyof typeof texts] || level;
  };

  const getMatchLevelColor = (level: string) => {
    const colors = {
      low: '#ef4444',
      medium: '#f59e0b',
      high: '#22c55e',
      super: '#8b5cf6'
    };
    return colors[level as keyof typeof colors] || '#888';
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
    setArtistTracks([]);
    setIsArtistInfoLoading(true);
    
    const info = await getArtistWikipediaInfo(artist.name, lang);
    setArtistInfo(info);
    
    // Get unique tracks by title
    const seenTitles = new Set<string>();
    const tracks = allScrobbles
      .filter(s => {
        if (normalizeArtistName(s.artist) !== artist.name) return false;
        if (seenTitles.has(s.title)) return false;
        seenTitles.add(s.title);
        return true;
      })
      .slice(0, 5);
    setArtistTracks(tracks);
    
    setIsArtistInfoLoading(false);
  };

  const closeArtistDialog = () => {
    setSelectedArtist(null);
    setArtistInfo(null);
    setArtistTracks([]);
  };

  const openWikipedia = () => {
    if (artistInfo?.content_urls?.desktop.page) {
      window.open(artistInfo.content_urls.desktop.page, '_blank');
    }
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

      {/* Main content - Two columns */}
      <div className="profile-content">
        {/* Left column - Recent tracks */}
        <div className="profile-main">
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">{t.recentTracks}</h2>
              {isExpanded && (
                <Button
                  view="flat"
                  size="s"
                  onClick={() => {
                    setIsExpanded(false);
                    setCurrentPage(1);
                  }}
                >
                  <Icon data={ChevronUp} size={14} />
                  {lang === 'ru' ? 'Свернуть' : 'Collapse'}
                </Button>
              )}
            </div>
            
            {scrobbles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎧</div>
                <p>{isOwnProfile ? t.turnOnSpotify : t.noScrobbles}</p>
              </div>
            ) : (
              <>
                <div className="feed">
                  {(isExpanded 
                    ? allScrobbles.slice((currentPage - 1) * TRACKS_PER_PAGE, currentPage * TRACKS_PER_PAGE)
                    : scrobbles
                  ).map((scrobble) => (
                    <ScrobbleCard
                      key={scrobble.id}
                      scrobble={scrobble}
                      timeAgo={formatTimeI18n(scrobble.timestamp, t)}
                      showUser={false}
                    />
                  ))}
                </div>
                
                {isExpanded ? (
                  <div className="pagination-container">
                    <Pagination
                      page={currentPage}
                      pageSize={TRACKS_PER_PAGE}
                      total={allScrobbles.length}
                      onUpdate={(page) => setCurrentPage(page)}
                    />
                  </div>
                ) : allScrobbles.length > 10 && (
                  <Button
                    view="flat"
                    size="l"
                    width="max"
                    onClick={() => setIsExpanded(true)}
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

        {/* Right column - Top artists & albums */}
        <div className="profile-sidebar">
          {/* Music Match Widget (only on other profiles) */}
          {!isOwnProfile && musicMatch && musicMatch.commonArtists.length > 0 && (
            <div className="music-match-widget">
              <div className="music-match-header">
                <Avatar
                  imgUrl={avatarUrl || ''}
                  size="m"
                  text={user.name?.charAt(0) || '?'}
                />
                <div className="music-match-info">
                  <div className="music-match-title">
                    {lang === 'ru' ? 'Совместимость с' : 'Match with'} {user.name}:{' '}
                    <span style={{ color: getMatchLevelColor(musicMatch.level) }}>
                      {getMatchLevelText(musicMatch.level)}
                    </span>
                  </div>
                  <div className="music-match-artists">
                    {lang === 'ru' ? 'Вы оба слушаете' : 'You both listen to'}{' '}
                    {musicMatch.commonArtists.slice(0, 3).map((a, i) => (
                      <span key={a.name}>
                        <strong>{a.name}</strong>
                        {i < Math.min(2, musicMatch.commonArtists.length - 1) && ', '}
                        {i === Math.min(2, musicMatch.commonArtists.length - 1) - 1 && 
                          musicMatch.commonArtists.length > 2 && (lang === 'ru' ? ' и ' : ' and ')}
                      </span>
                    ))}
                    {musicMatch.commonArtists.length > 3 && (
                      <span> {lang === 'ru' ? `и ещё ${musicMatch.commonArtists.length - 3}` : `and ${musicMatch.commonArtists.length - 3} more`}</span>
                    )}
                  </div>
                </div>
              </div>
              <Progress
                value={musicMatch.percentage}
                size="s"
                theme="success"
                className="music-match-progress"
              />
              <Button
                view="flat"
                size="s"
                onClick={() => setIsMatchDialogOpen(true)}
                className="music-match-details-btn"
              >
                {lang === 'ru' ? 'Подробнее' : 'Details'}
                <Icon data={ChevronRight} size={14} />
              </Button>
            </div>
          )}

          {/* Top Artists */}
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

          {/* Top Albums */}
          {topAlbums.length > 0 && (
            <div className="top-albums-section">
              <h3 className="top-artists-title">
                {lang === 'ru' ? 'Топ альбомы' : 'Top Albums'}
              </h3>
              <div className="top-artists-grid">
                {topAlbums.map((album) => (
                  <div 
                    key={`${album.name}-${album.artist}`} 
                    className="top-artist-tile"
                  >
                    {album.imageUrl ? (
                      <img 
                        src={album.imageUrl} 
                        alt={album.name}
                        className="top-artist-tile-image"
                      />
                    ) : (
                      <div className="top-artist-tile-image top-artist-tile-placeholder">
                        💿
                      </div>
                    )}
                    <div className="top-artist-tile-overlay">
                      <div className="top-artist-tile-name">{album.name}</div>
                      <div className="top-artist-tile-count">{album.artist}</div>
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
        hasCloseButton={false}
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
          ) : (
            <div className="artist-dialog-content">
              {artistInfo ? (
                <p className="artist-dialog-extract">{artistInfo.extract}</p>
              ) : (
                <p className="artist-dialog-empty-text">
                  {lang === 'ru' 
                    ? 'Информация об исполнителе не найдена'
                    : 'Artist information not found'
                  }
                </p>
              )}
              
              {artistTracks.length > 0 && (
                <div className="artist-dialog-tracks">
                  <h4 className="artist-dialog-tracks-title">
                    {isOwnProfile 
                      ? (lang === 'ru' 
                          ? `Вы слушали у ${selectedArtist?.name}:`
                          : `You listened from ${selectedArtist?.name}:`)
                      : (lang === 'ru'
                          ? `${user?.name} слушал(а) у ${selectedArtist?.name}:`
                          : `${user?.name} listened from ${selectedArtist?.name}:`)
                    }
                  </h4>
                  <div className="artist-dialog-tracks-list">
                    {artistTracks.map((track, idx) => (
                      <div key={`${track.id}-${idx}`} className="artist-dialog-track">
                        {track.albumArtURL && (
                          <img 
                            src={track.albumArtURL} 
                            alt="" 
                            className="artist-dialog-track-art"
                          />
                        )}
                        <div className="artist-dialog-track-info">
                          <div className="artist-dialog-track-title">{track.title}</div>
                          <div className="artist-dialog-track-album">{track.album}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={closeArtistDialog}
          textButtonCancel={lang === 'ru' ? 'Закрыть' : 'Close'}
          onClickButtonApply={artistInfo?.content_urls ? openWikipedia : undefined}
          textButtonApply={artistInfo?.content_urls ? 'Wikipedia' : undefined}
          propsButtonApply={{ view: 'flat' }}
        />
      </Dialog>

      {/* Music Match Dialog */}
      <Dialog
        open={isMatchDialogOpen}
        onClose={() => setIsMatchDialogOpen(false)}
        size="m"
        hasCloseButton={false}
      >
        <Dialog.Header
          caption={lang === 'ru' 
            ? `Музыкальная совместимость с ${user?.name}`
            : `Music compatibility with ${user?.name}`
          }
        />
        <Dialog.Body>
          {musicMatch && (
            <div className="match-dialog-content">
              {/* Common Artists */}
              <div className="match-dialog-section">
                <h4 className="match-dialog-section-title">
                  {lang === 'ru' 
                    ? `Вы и ${user?.name} оба слушаете`
                    : `You and ${user?.name} both listen to`
                  }
                </h4>
                <div className="top-artists-grid match-dialog-grid">
                  {musicMatch.commonArtists.slice(0, 6).map((artist) => (
                    <div 
                      key={artist.name} 
                      className="top-artist-tile"
                      onClick={() => {
                        setIsMatchDialogOpen(false);
                        handleArtistClick(artist);
                      }}
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {musicMatch.recommendations.length > 0 && (
                <div className="match-dialog-section">
                  <h4 className="match-dialog-section-title">
                    {lang === 'ru' 
                      ? 'Для большей совместимости послушайте'
                      : 'To increase compatibility, listen to'
                    }
                  </h4>
                  <div className="top-artists-grid match-dialog-grid">
                    {musicMatch.recommendations.map((artist) => (
                      <div 
                        key={artist.name} 
                        className="top-artist-tile"
                        onClick={() => {
                          setIsMatchDialogOpen(false);
                          handleArtistClick(artist);
                        }}
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setIsMatchDialogOpen(false)}
          textButtonCancel={lang === 'ru' ? 'Закрыть' : 'Close'}
        />
      </Dialog>
    </div>
  );
}
