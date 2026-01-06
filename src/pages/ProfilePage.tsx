import { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '../utils/logger';
import { useParams } from 'react-router-dom';
import { Loader, Button, Dialog, Pagination, Avatar, Progress, Skeleton, TextInput, SegmentedRadioGroup } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { PersonPlus, PersonXmark, Magnifier, ChevronLeft } from '@gravity-ui/icons';
import { 
  getUser, 
  getUserScrobbles, 
  isFollowing, 
  followUser, 
  unfollowUser,
  getFollowCounts,
  getUserLikes,
  likeScrobble,
  unlikeScrobble,
  checkLikedScrobbles
} from '../services/firebase';
import { getArtistsByIds, getArtistImages } from '../services/spotify';
import { getArtistWikipediaInfo, WikipediaArtistInfo } from '../services/wikipedia';
import { User, Scrobble } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useI18n, formatTimeI18n } from '../hooks/useI18n';
import { useScrobbler } from '../hooks/useScrobbler';
import { ScrobbleCard } from '../components/ScrobbleCard';

interface TopArtist {
  name: string;
  artistId?: string;  // Spotify Artist ID for accurate image
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

function normalizeArtistName(artist: string): string {
  const separators = [',', ' feat.', ' feat ', ' ft.', ' ft ', ' featuring ', ' & ', ' x ', ' X '];
  let name = artist;
  for (const sep of separators) {
    const idx = name.toLowerCase().indexOf(sep.toLowerCase());
    if (idx > 0) name = name.substring(0, idx);
  }
  return name.trim();
}

const TRACKS_PER_PAGE = 10;

export function ProfilePage() {
  const { odl } = useParams<{ odl: string }>();
  const { spotifyId, avatarUrl, user: currentUser } = useAuth();
  const { t, lang } = useI18n();
  const { currentlyPlaying } = useScrobbler();
  
  const [user, setUser] = useState<User | null>(null);
  const [allScrobbles, setAllScrobbles] = useState<Scrobble[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [topAlbums, setTopAlbums] = useState<TopAlbum[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isArtistsLoading, setIsArtistsLoading] = useState(true);
  
  const [followStatus, setFollowStatus] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedArtist, setSelectedArtist] = useState<TopArtist | null>(null);
  const [artistInfo, setArtistInfo] = useState<WikipediaArtistInfo | null>(null);
  const [artistTracks, setArtistTracks] = useState<Scrobble[]>([]);
  const [isArtistInfoLoading, setIsArtistInfoLoading] = useState(false);
  const [openedFromMatchDialog, setOpenedFromMatchDialog] = useState(false);
  
  const [musicMatch, setMusicMatch] = useState<MusicMatch | null>(null);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  
  // Tracks view mode: recent or liked
  const [tracksMode, setTracksMode] = useState<'recent' | 'liked'>('recent');
  const [likedScrobbles, setLikedScrobbles] = useState<Scrobble[]>([]);
  const [isLikedLoading, setIsLikedLoading] = useState(false);
  const [likedScrobbleIds, setLikedScrobbleIds] = useState<Set<string>>(new Set());

  const isOwnProfile = odl === spotifyId || !odl;
  const targetOdl = odl || spotifyId;
  
  // Get current scrobbles based on mode
  const currentScrobbles = tracksMode === 'recent' ? allScrobbles : likedScrobbles;

  // Filter scrobbles based on search
  const filteredScrobbles = useMemo(() => {
    if (!searchQuery.trim()) return currentScrobbles;
    const query = searchQuery.toLowerCase();
    return currentScrobbles.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.artist.toLowerCase().includes(query) ||
      s.album?.toLowerCase().includes(query)
    );
  }, [currentScrobbles, searchQuery]);

  // Paginated scrobbles
  const paginatedScrobbles = useMemo(() => {
    const start = (currentPage - 1) * TRACKS_PER_PAGE;
    return filteredScrobbles.slice(start, start + TRACKS_PER_PAGE);
  }, [filteredScrobbles, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  // Reset page when mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tracksMode]);

  // Load liked tracks when switching to liked mode
  useEffect(() => {
    if (tracksMode === 'liked' && targetOdl && likedScrobbles.length === 0) {
      loadLikedTracks();
    }
  }, [tracksMode, targetOdl]);

  const loadLikedTracks = async () => {
    if (!targetOdl) return;
    
    setIsLikedLoading(true);
    try {
      const likes = await getUserLikes(targetOdl, 100);
      
      // Create a map of scrobbleId -> albumArtURL from loaded scrobbles
      const scrobbleArtMap = new Map<string, string>();
      allScrobbles.forEach(s => {
        if (s.id && s.albumArtURL) {
          scrobbleArtMap.set(s.id, s.albumArtURL);
        }
      });
      
      // Convert likes to scrobble-like objects, enriching with album art
      const likedAsScrobbles: Scrobble[] = likes.map(like => ({
        id: like.scrobbleId,
        odl: like.ownerOdl,
        title: like.trackName,
        artist: like.artistName,
        trackId: like.trackId,
        // Prefer album art from like, fallback to scrobble
        albumArtURL: like.albumArtURL || scrobbleArtMap.get(like.scrobbleId),
        timestamp: like.timestamp,
      }));
      setLikedScrobbles(likedAsScrobbles);
    } catch (error) {
      logger.error('Error loading liked tracks:', error);
    } finally {
      setIsLikedLoading(false);
    }
  };

  useEffect(() => {
    if (!targetOdl) return;
    loadProfile();
  }, [targetOdl, spotifyId]);

  const loadProfile = async () => {
    if (!targetOdl) return;
    
    setIsLoading(true);
    setIsArtistsLoading(true);
    
    try {
      const [userData, scrobblesData, counts] = await Promise.all([
        getUser(targetOdl),
        getUserScrobbles(targetOdl, 500),
        getFollowCounts(targetOdl)
      ]);
      
      setUser(userData);
      setAllScrobbles(scrobblesData);
      setFollowCounts(counts);
      
      // Calculate top artists (store artistId for accurate image fetching)
      const artistMap = new Map<string, { count: number; artistId?: string; albumArtUrl?: string }>();
      scrobblesData.forEach(scrobble => {
        const normalizedName = normalizeArtistName(scrobble.artist);
        const existing = artistMap.get(normalizedName);
        if (existing) {
          existing.count++;
          // Prefer artistId if available
          if (!existing.artistId && scrobble.artistId) {
            existing.artistId = scrobble.artistId;
          }
        } else {
          artistMap.set(normalizedName, { 
            count: 1, 
            artistId: scrobble.artistId,
            albumArtUrl: scrobble.albumArtURL 
          });
        }
      });
      
      const topArtistsList: TopArtist[] = Array.from(artistMap.entries())
        .map(([name, data]) => ({ 
          name, 
          artistId: data.artistId,
          count: data.count, 
          imageUrl: data.albumArtUrl 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      
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
      
      // Fetch artist images - prefer by ID, fallback to name search
      try {
        // Collect artists with IDs and without
        const artistsWithIds = topArtistsList.filter(a => a.artistId);
        const artistsWithoutIds = topArtistsList.filter(a => !a.artistId);
        
        // Fetch by ID (most accurate)
        let idImageMap = new Map<string, string>();
        if (artistsWithIds.length > 0) {
          const ids = artistsWithIds.map(a => a.artistId!);
          const artistData = await getArtistsByIds(ids);
          artistData.forEach((artist, id) => {
            if (artist.images?.[0]?.url) {
              idImageMap.set(id, artist.images[0].url);
            }
          });
        }
        
        // Fetch by name (fallback for old scrobbles without artistId)
        let nameImageMap = new Map<string, string | null>();
        if (artistsWithoutIds.length > 0) {
          const names = artistsWithoutIds.map(a => a.name);
          nameImageMap = await getArtistImages(names);
        }
        
        // Merge results
        const artistsWithImages = topArtistsList.map(artist => {
          let imageUrl = artist.imageUrl; // Default: album art
          
          if (artist.artistId && idImageMap.has(artist.artistId)) {
            imageUrl = idImageMap.get(artist.artistId)!;
          } else if (nameImageMap.has(artist.name) && nameImageMap.get(artist.name)) {
            imageUrl = nameImageMap.get(artist.name)!;
          }
          
          return { ...artist, imageUrl };
        });
        
        setTopArtists(artistsWithImages);
        setTopAlbums(topAlbumsList);
        
        // Load music match for other profiles (AFTER artist images are loaded)
        if (spotifyId && targetOdl && spotifyId !== targetOdl) {
          const following = await isFollowing(spotifyId, targetOdl);
          setFollowStatus(following);
          
          const myData = await getUserScrobbles(spotifyId, 100);
          const match = calculateMusicMatch(myData, scrobblesData, artistsWithImages);
          setMusicMatch(match);
        }
      } catch {
        setTopArtists(topArtistsList);
        setTopAlbums(topAlbumsList);
        
        // Fallback: calculate match with album images
        if (spotifyId && targetOdl && spotifyId !== targetOdl) {
          const following = await isFollowing(spotifyId, targetOdl);
          setFollowStatus(following);
          
          const myData = await getUserScrobbles(spotifyId, 100);
          const match = calculateMusicMatch(myData, scrobblesData, topArtistsList);
          setMusicMatch(match);
        }
      }
      
      setIsArtistsLoading(false);
    } catch (error) {
      logger.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMusicMatch = (
    myScrobbles: Scrobble[], 
    theirScrobbles: Scrobble[],
    theirTopArtists: TopArtist[]
  ): MusicMatch => {
    const myArtists = new Set<string>();
    const myArtistCounts = new Map<string, number>();
    myScrobbles.forEach(s => {
      const name = normalizeArtistName(s.artist);
      myArtists.add(name);
      myArtistCounts.set(name, (myArtistCounts.get(name) || 0) + 1);
    });
    
    const theirArtists = new Set<string>();
    theirScrobbles.forEach(s => theirArtists.add(normalizeArtistName(s.artist)));
    
    const commonArtistNames = [...myArtists].filter(a => theirArtists.has(a));
    
    const commonArtists: TopArtist[] = commonArtistNames
      .map(name => {
        const fromTop = theirTopArtists.find(a => a.name === name);
        return { name, count: myArtistCounts.get(name) || 0, imageUrl: fromTop?.imageUrl };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const recommendations: TopArtist[] = theirTopArtists
      .filter(a => !myArtists.has(a.name))
      .slice(0, 6);
    
    const totalUnique = new Set([...myArtists, ...theirArtists]).size;
    const percentage = totalUnique > 0 ? Math.round((commonArtistNames.length / totalUnique) * 100) : 0;
    
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
    return { low: '#ef4444', medium: '#f59e0b', high: '#22c55e', super: '#8b5cf6' }[level] || '#888';
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
      logger.error('Error toggling follow:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Load liked scrobble IDs when scrobbles change
  useEffect(() => {
    const loadLikedIds = async () => {
      if (!spotifyId || currentScrobbles.length === 0) return;
      const scrobbleIds = currentScrobbles.map(s => s.id);
      const likedIds = await checkLikedScrobbles(spotifyId, scrobbleIds);
      setLikedScrobbleIds(likedIds);
    };
    loadLikedIds();
  }, [spotifyId, currentScrobbles]);

  const handleLike = useCallback(async (scrobble: Scrobble) => {
    if (!spotifyId || !currentUser) return;
    
    await likeScrobble(scrobble, {
      odl: spotifyId,
      name: currentUser.name || 'User',
      avatar: avatarUrl || undefined
    });
    
    setLikedScrobbleIds(prev => new Set([...prev, scrobble.id]));
  }, [spotifyId, currentUser, avatarUrl]);

  const handleUnlike = useCallback(async (scrobbleId: string) => {
    if (!spotifyId) return;
    
    await unlikeScrobble(spotifyId, scrobbleId);
    
    setLikedScrobbleIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(scrobbleId);
      return newSet;
    });
    
    // Remove from liked list if in liked mode
    if (tracksMode === 'liked') {
      setLikedScrobbles(prev => prev.filter(s => s.id !== scrobbleId));
    }
  }, [spotifyId, tracksMode]);

  const handleArtistClick = async (artist: TopArtist) => {
    setSelectedArtist(artist);
    setArtistInfo(null);
    setArtistTracks([]);
    setIsArtistInfoLoading(true);
    
    const info = await getArtistWikipediaInfo(artist.name, lang);
    setArtistInfo(info);
    
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
    setOpenedFromMatchDialog(false);
  };
  
  const handleBackToMatch = () => {
    setSelectedArtist(null);
    setArtistInfo(null);
    setArtistTracks([]);
    setOpenedFromMatchDialog(false);
    setIsMatchDialogOpen(true);
  };

  const openWikipedia = () => {
    if (artistInfo?.content_urls?.desktop.page) {
      window.open(artistInfo.content_urls.desktop.page, '_blank');
    }
  };

  // Current track - use real-time scrobbler for own profile, otherwise user data
  const currentTrack = isOwnProfile && currentlyPlaying?.item
    ? { 
        trackId: currentlyPlaying.item.id,
        trackName: currentlyPlaying.item.name, 
        artistName: currentlyPlaying.item.artists[0]?.name || 'Unknown',
        albumArtURL: currentlyPlaying.item.album?.images?.[0]?.url,
        timestamp: new Date() 
      }
    : user?.currentTrack;
  const isCurrentlyPlaying = isOwnProfile 
    ? !!(currentlyPlaying?.is_playing && currentlyPlaying?.item)
    : currentTrack && 
      currentTrack.timestamp && 
      (Date.now() - new Date(currentTrack.timestamp).getTime()) < 10 * 60 * 1000; // Within 10 min

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

  // Skeleton for artist tiles
  const ArtistSkeletons = () => (
    <div className="top-artists-grid">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="top-artist-tile skeleton-tile">
          <Skeleton className="skeleton-image" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="profile-page">
      {/* Hero Header */}
      <div className="profile-hero">
        {(isCurrentlyPlaying ? currentTrack?.albumArtURL : allScrobbles[0]?.albumArtURL) && (
          <div className="profile-hero-bg" style={{ 
            backgroundImage: `url(${isCurrentlyPlaying ? currentTrack?.albumArtURL : allScrobbles[0]?.albumArtURL})` 
          }} />
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
            
            <div className="profile-hero-listening">
              {isCurrentlyPlaying ? (
                <>
                  <span className="now-playing-indicator" />
                  {currentTrack?.trackName} — {currentTrack?.artistName}
                </>
              ) : (
                <span className="not-playing">
                  {lang === 'ru' ? 'Сейчас ничего не слушает' : 'Not listening right now'}
                </span>
              )}
            </div>
            
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

      <div className="profile-content">
        <div className="profile-main">
          <div className="section">
            <div className="section-header">
              <SegmentedRadioGroup
                value={tracksMode}
                onUpdate={(val) => setTracksMode(val as 'recent' | 'liked')}
                size="l"
                width="auto"
              >
                <SegmentedRadioGroup.Option value="recent">
                  {t.recentTracks}
                </SegmentedRadioGroup.Option>
                <SegmentedRadioGroup.Option value="liked">
                  {t.likedTracks}
                </SegmentedRadioGroup.Option>
              </SegmentedRadioGroup>
              <TextInput
                placeholder={t.searchTracks}
                value={searchQuery}
                onUpdate={setSearchQuery}
                size="m"
                startContent={<Icon data={Magnifier} size={16} />}
                hasClear
                className="track-search-input"
                validationState={searchQuery && filteredScrobbles.length === 0 ? 'invalid' : undefined}
                errorMessage={lang === 'ru' ? 'Трек не найден' : 'Track not found'}
                errorPlacement="inside"
              />
            </div>
            
            {(tracksMode === 'liked' && isLikedLoading) ? (
              <div className="loading-container">
                <Loader size="m" />
              </div>
            ) : currentScrobbles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">{tracksMode === 'liked' ? '❤️' : '🎧'}</div>
                <p>{tracksMode === 'liked' 
                  ? (lang === 'ru' ? 'Нет понравившихся треков' : 'No liked tracks yet')
                  : (isOwnProfile ? t.turnOnSpotify : t.noScrobbles)
                }</p>
              </div>
            ) : filteredScrobbles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <p>{lang === 'ru' ? 'Ничего не найдено' : 'Nothing found'}</p>
              </div>
            ) : (
              <>
                <div className="feed">
                  {paginatedScrobbles.map((scrobble) => {
                    // On own profile's "Liked" section, all tracks are by definition liked by us
                    const isLikedByMe = (isOwnProfile && tracksMode === 'liked') || likedScrobbleIds.has(scrobble.id);
                    return (
                      <ScrobbleCard
                        key={scrobble.id}
                        scrobble={scrobble}
                        timeAgo={formatTimeI18n(scrobble.timestamp, t)}
                        showUser={false}
                        isLiked={isLikedByMe}
                        onLike={() => handleLike(scrobble)}
                        onUnlike={() => handleUnlike(scrobble.id)}
                        canLike={!!spotifyId}
                        lang={lang}
                        showSpotifyLiked={isOwnProfile}
                      />
                    );
                  })}
                </div>
                
                {filteredScrobbles.length > TRACKS_PER_PAGE && (
                  <div className="pagination-container">
                    <Pagination
                      page={currentPage}
                      pageSize={TRACKS_PER_PAGE}
                      total={filteredScrobbles.length}
                      onUpdate={(page) => setCurrentPage(page)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="profile-sidebar">
          {/* Music Match Widget */}
          {!isOwnProfile && musicMatch && musicMatch.commonArtists.length > 0 && (
            <div className="music-match-widget">
              <div className="music-match-header">
                <Avatar imgUrl={avatarUrl || ''} size="m" text={user.name?.charAt(0) || '?'} />
                <div className="music-match-info">
                  <div className="music-match-title">
                    {lang === 'ru' ? 'Совместимость с' : 'Match with'} {user.name}:{' '}
                    <span style={{ color: getMatchLevelColor(musicMatch.level) }}>{getMatchLevelText(musicMatch.level)}</span>
                  </div>
                  <div className="music-match-artists">
                    {lang === 'ru' ? 'Вы оба слушаете' : 'You both listen to'}{' '}
                    {musicMatch.commonArtists.slice(0, 3).map((a, i) => (
                      <span key={a.name}>
                        <strong>{a.name}</strong>
                        {i < Math.min(2, musicMatch.commonArtists.length - 1) && ', '}
                      </span>
                    ))}
                    {musicMatch.commonArtists.length > 3 && (
                      <span> {lang === 'ru' ? `и ещё ${musicMatch.commonArtists.length - 3}` : `and ${musicMatch.commonArtists.length - 3} more`}</span>
                    )}
                  </div>
                </div>
              </div>
              <Progress value={musicMatch.percentage} size="s" theme="success" className="music-match-progress" />
              <Button view="flat" size="s" onClick={() => setIsMatchDialogOpen(true)} className="music-match-details-btn">
                {lang === 'ru' ? 'Подробнее' : 'Details'}
              </Button>
            </div>
          )}

          {/* Top Artists */}
          {isArtistsLoading ? (
            <div className="top-artists-section">
              <h3 className="top-artists-title">{lang === 'ru' ? 'Топ исполнители' : 'Top Artists'}</h3>
              <ArtistSkeletons />
            </div>
          ) : topArtists.length > 0 && (
            <div className="top-artists-section">
              <h3 className="top-artists-title">{lang === 'ru' ? 'Топ исполнители' : 'Top Artists'}</h3>
              <div className="top-artists-grid">
                {topArtists.map((artist) => (
                  <div key={artist.name} className="top-artist-tile" onClick={() => handleArtistClick(artist)}>
                    {artist.imageUrl ? (
                      <img src={artist.imageUrl} alt={artist.name} className="top-artist-tile-image" />
                    ) : (
                      <div className="top-artist-tile-image top-artist-tile-placeholder">🎵</div>
                    )}
                    <div className="top-artist-tile-overlay">
                      <div className="top-artist-tile-name">{artist.name}</div>
                      <div className="top-artist-tile-count">
                        {artist.count} {lang === 'ru' ? 'прослушиваний' : 'plays'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Albums - only show after artists loaded */}
          {!isArtistsLoading && topAlbums.length > 0 && (
            <div className="top-albums-section">
              <h3 className="top-artists-title">{lang === 'ru' ? 'Топ альбомы' : 'Top Albums'}</h3>
              <div className="top-artists-grid">
                {topAlbums.map((album) => (
                  <div key={`${album.name}-${album.artist}`} className="top-artist-tile">
                    {album.imageUrl ? (
                      <img src={album.imageUrl} alt={album.name} className="top-artist-tile-image" />
                    ) : (
                      <div className="top-artist-tile-image top-artist-tile-placeholder">💿</div>
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
      <Dialog open={!!selectedArtist} onClose={closeArtistDialog} size="m" hasCloseButton={false} className="artist-dialog">
        <Dialog.Header
          caption={selectedArtist?.name || ''}
          insertBefore={selectedArtist?.imageUrl ? <img src={selectedArtist.imageUrl} alt="" className="artist-dialog-avatar" /> : undefined}
        />
        <Dialog.Body>
          {isArtistInfoLoading ? (
            <div className="artist-dialog-loading"><Loader size="m" /></div>
          ) : (
            <div className="artist-dialog-content">
              {artistInfo ? (
                <p className="artist-dialog-extract">{artistInfo.extract}</p>
              ) : (
                <p className="artist-dialog-empty-text">
                  {lang === 'ru' ? 'Информация об исполнителе не найдена' : 'Artist information not found'}
                </p>
              )}
              
              {artistTracks.length > 0 && (
                <div className="artist-dialog-tracks">
                  <h4 className="artist-dialog-tracks-title">
                    {isOwnProfile 
                      ? (lang === 'ru' ? `Вы слушали у ${selectedArtist?.name}:` : `You listened from ${selectedArtist?.name}:`)
                      : (lang === 'ru' ? `${user?.name} слушал(а) у ${selectedArtist?.name}:` : `${user?.name} listened from ${selectedArtist?.name}:`)
                    }
                  </h4>
                  <div className="artist-dialog-tracks-list">
                    {artistTracks.map((track, idx) => (
                      <div key={`${track.id}-${idx}`} className="artist-dialog-track">
                        {track.albumArtURL && <img src={track.albumArtURL} alt="" className="artist-dialog-track-art" />}
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
          renderButtons={() => (
            <div className="artist-dialog-footer">
              {openedFromMatchDialog && (
                <Button view="flat" size="m" onClick={handleBackToMatch}>
                  <Icon data={ChevronLeft} size={16} />
                </Button>
              )}
              <div className="artist-dialog-footer-right">
                <Button view="flat" size="m" onClick={closeArtistDialog}>
                  {lang === 'ru' ? 'Закрыть' : 'Close'}
                </Button>
                {artistInfo?.content_urls && (
                  <Button view="flat" size="m" onClick={openWikipedia}>
                    Wikipedia
                  </Button>
                )}
              </div>
            </div>
          )}
        />
      </Dialog>

      {/* Music Match Dialog */}
      <Dialog open={isMatchDialogOpen} onClose={() => setIsMatchDialogOpen(false)} size="m" hasCloseButton={false} className="match-dialog">
        <Dialog.Header caption={lang === 'ru' ? `Музыкальная совместимость с ${user?.name}` : `Music compatibility with ${user?.name}`} />
        <Dialog.Body>
          {musicMatch && (
            <div className="match-dialog-content">
              <div className="match-dialog-section">
                <h4 className="match-dialog-section-title">
                  {lang === 'ru' ? `Вы и ${user?.name} оба слушаете` : `You and ${user?.name} both listen to`}
                </h4>
                <div className="top-artists-grid match-dialog-grid">
                  {musicMatch.commonArtists.slice(0, 6).map((artist) => (
                    <div key={artist.name} className="top-artist-tile" onClick={() => { setIsMatchDialogOpen(false); setOpenedFromMatchDialog(true); handleArtistClick(artist); }}>
                      {artist.imageUrl ? (
                        <img src={artist.imageUrl} alt={artist.name} className="top-artist-tile-image" />
                      ) : (
                        <div className="top-artist-tile-image top-artist-tile-placeholder">🎵</div>
                      )}
                      <div className="top-artist-tile-overlay">
                        <div className="top-artist-tile-name">{artist.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {musicMatch.recommendations.length > 0 && (
                <div className="match-dialog-section">
                  <h4 className="match-dialog-section-title">
                    {lang === 'ru' ? 'Для большей совместимости послушайте' : 'To increase compatibility, listen to'}
                  </h4>
                  <div className="top-artists-grid match-dialog-grid">
                    {musicMatch.recommendations.map((artist) => (
                      <div key={artist.name} className="top-artist-tile" onClick={() => { setIsMatchDialogOpen(false); setOpenedFromMatchDialog(true); handleArtistClick(artist); }}>
                        {artist.imageUrl ? (
                          <img src={artist.imageUrl} alt={artist.name} className="top-artist-tile-image" />
                        ) : (
                          <div className="top-artist-tile-image top-artist-tile-placeholder">🎵</div>
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
        <Dialog.Footer onClickButtonCancel={() => setIsMatchDialogOpen(false)} textButtonCancel={lang === 'ru' ? 'Закрыть' : 'Close'} />
      </Dialog>
    </div>
  );
}
