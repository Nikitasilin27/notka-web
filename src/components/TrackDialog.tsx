import { Dialog, Button, Label, Loader, Link } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { Heart, HeartFill, Play } from '@gravity-ui/icons';
import { useState, useEffect } from 'react';
import { getTrackDetails, getTrackAlbums, getSimilarTracks } from '../services/spotify';
import { likeScrobble, unlikeScrobble } from '../services/firebase';
import { getArtistWikipediaInfo, WikipediaArtistInfo } from '../services/wikipedia';
import { useAuth } from '../hooks/useAuth';
import { Scrobble } from '../types';

interface TrackDialogProps {
  trackId: string | null;
  trackName?: string;
  artistName?: string;
  albumArtURL?: string;
  scrobble?: Scrobble;
  isLiked: boolean;
  open: boolean;
  onClose: () => void;
  lang: 'ru' | 'en';
}

interface TrackDetails {
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
    release_date: string;
  };
  duration_ms: number;
  preview_url?: string;
}

interface TrackAlbum {
  name: string;
  images: Array<{ url: string }>;
  release_date: string;
  album_type: string; // "album", "single", "compilation"
}

interface SimilarTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
}

export function TrackDialog({
  trackId,
  trackName,
  artistName,
  albumArtURL,
  scrobble,
  isLiked: initialIsLiked,
  open,
  onClose,
  lang
}: TrackDialogProps) {
  const { spotifyId, user } = useAuth();
  const [trackDetails, setTrackDetails] = useState<TrackDetails | null>(null);
  const [trackAlbums, setTrackAlbums] = useState<TrackAlbum[]>([]);
  const [similarTracks, setSimilarTracks] = useState<SimilarTrack[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [artistDialogOpen, setArtistDialogOpen] = useState(false);
  const [artistInfo, setArtistInfo] = useState<WikipediaArtistInfo | null>(null);
  const [isArtistInfoLoading, setIsArtistInfoLoading] = useState(false);

  useEffect(() => {
    setIsLiked(initialIsLiked);
  }, [initialIsLiked]);

  useEffect(() => {
    if (!trackId || !open) return;

    const loadTrackData = async () => {
      setIsLoading(true);

      try {
        // Load track details
        const details = await getTrackDetails(trackId);
        setTrackDetails(details);

        // Load albums where this track appears
        if (details && details.artists[0]) {
          const albums = await getTrackAlbums(trackId, details.artists[0].id);
          setTrackAlbums(albums);
        }

        // Load similar tracks
        const similar = await getSimilarTracks(trackId);
        setSimilarTracks(similar);

        // Get genres from artist (Spotify doesn't have track genres)
        // TODO: Implement getArtistGenres in spotify.ts
        setGenres(['Rock', 'Alternative']); // Placeholder
      } catch (error) {
        console.error('Error loading track data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrackData();
  }, [trackId, open]);

  const handleLikeToggle = async () => {
    if (!scrobble || !spotifyId || !user) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        await unlikeScrobble(spotifyId, scrobble.id);
        setIsLiked(false);
      } else {
        await likeScrobble(scrobble, {
          odl: spotifyId,
          name: user.name,
          avatar: user.avatarURL
        });
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return lang === 'ru'
      ? date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleArtistClick = async () => {
    const artist = trackDetails?.artists[0]?.name || artistName;
    if (!artist) return;

    setArtistDialogOpen(true);
    setArtistInfo(null);
    setIsArtistInfoLoading(true);

    const info = await getArtistWikipediaInfo(artist, lang);
    setArtistInfo(info);
    setIsArtistInfoLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="l"
      hasCloseButton={false}
      className="track-dialog"
    >
      <Dialog.Header caption="" />
      <Dialog.Body>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Loader size="m" />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Track Cover - Left */}
            <div style={{ flexShrink: 0 }}>
              <img
                src={trackDetails?.album.images[0]?.url || albumArtURL || ''}
                alt={trackDetails?.name || trackName}
                style={{
                  width: '230px',
                  height: '230px',
                  borderRadius: '8px',
                  objectFit: 'cover'
                }}
              />
            </div>

            {/* Track Info - Right */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Artist (clickable) */}
              <Link
                view="normal"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleArtistClick();
                }}
                style={{
                  fontSize: '16px',
                  color: '#888',
                  marginBottom: '8px',
                  display: 'block',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  fontWeight: 400
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--notka-brand)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#888';
                }}
              >
                {trackDetails?.artists[0]?.name || artistName}
              </Link>

              {/* Track Name + Like */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, flex: 1 }}>
                  {trackDetails?.name || trackName}
                </h3>
                {scrobble && (
                  <button
                    onClick={handleLikeToggle}
                    disabled={isLiking}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: isLiking ? 'wait' : 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      color: isLiked ? 'var(--notka-brand)' : '#888',
                      transition: 'color 0.2s'
                    }}
                  >
                    <Icon data={isLiked ? HeartFill : Heart} size={24} />
                  </button>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', fontSize: '14px' }}>
                {trackDetails?.duration_ms && (
                  <div>
                    <div style={{ color: '#888', marginBottom: '4px' }}>
                      {lang === 'ru' ? 'Продолжительность' : 'Duration'}
                    </div>
                    <div style={{ fontWeight: 500 }}>{formatDuration(trackDetails.duration_ms)}</div>
                  </div>
                )}
                {trackDetails?.album.release_date && (
                  <div>
                    <div style={{ color: '#888', marginBottom: '4px' }}>
                      {lang === 'ru' ? 'Дата выхода' : 'Release Date'}
                    </div>
                    <div style={{ fontWeight: 500 }}>{formatDate(trackDetails.album.release_date)}</div>
                  </div>
                )}
              </div>

              {/* Genres */}
              {genres.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#888', marginBottom: '8px', fontSize: '14px' }}>
                    {lang === 'ru' ? 'Жанры' : 'Genres'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {genres.map((genre, idx) => (
                      <Label key={idx} theme="info" size="s">
                        {genre}
                      </Label>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums/Releases */}
              {trackAlbums.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#888', marginBottom: '8px', fontSize: '14px' }}>
                    {lang === 'ru' ? 'Представлен на' : 'Appears on'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {trackAlbums.slice(0, 3).map((album, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {album.images[0] && (
                          <img
                            src={album.images[0].url}
                            alt={album.name}
                            style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {album.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            {album.album_type === 'album' ? (lang === 'ru' ? 'Альбом' : 'Album') :
                             album.album_type === 'single' ? (lang === 'ru' ? 'Сингл' : 'Single') :
                             (lang === 'ru' ? 'Сборник' : 'Compilation')}
                            {' • '}
                            {new Date(album.release_date).getFullYear()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Tracks */}
              {similarTracks.length > 0 && (
                <div>
                  <div style={{ color: '#888', marginBottom: '8px', fontSize: '14px' }}>
                    {lang === 'ru' ? 'Похожие композиции' : 'Similar Tracks'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {similarTracks.slice(0, 5).map((track) => (
                      <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {track.album.images[0] && (
                          <img
                            src={track.album.images[0].url}
                            alt={track.name}
                            style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            {track.artists.map(a => a.name).join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog.Body>
      <Dialog.Footer
        renderButtons={() => (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div>
              {trackDetails?.preview_url && (
                <Button
                  view="outlined"
                  size="m"
                  onClick={() => window.open(trackDetails.preview_url, '_blank')}
                >
                  <Icon data={Play} size={16} />
                  {lang === 'ru' ? 'Превью' : 'Preview'}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button view="flat" size="m" onClick={onClose}>
                {lang === 'ru' ? 'Закрыть' : 'Close'}
              </Button>
              {trackId && (
                <Button
                  view="outlined"
                  size="m"
                  onClick={() => window.open(`https://open.spotify.com/track/${trackId}`, '_blank')}
                >
                  {lang === 'ru' ? 'Открыть в Spotify' : 'Open in Spotify'}
                </Button>
              )}
            </div>
          </div>
        )}
      />

      {/* Artist Info Dialog */}
      <Dialog
        open={artistDialogOpen}
        onClose={() => setArtistDialogOpen(false)}
        size="m"
        hasCloseButton={false}
        className="artist-dialog"
      >
        <Dialog.Header caption={trackDetails?.artists[0]?.name || artistName || ''} />
        <Dialog.Body>
          {isArtistInfoLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Loader size="m" />
            </div>
          ) : (
            <div>
              {artistInfo ? (
                <p style={{ lineHeight: 1.6, color: '#888' }}>{artistInfo.extract}</p>
              ) : (
                <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  {lang === 'ru' ? 'Информация об исполнителе не найдена' : 'Artist information not found'}
                </p>
              )}
            </div>
          )}
        </Dialog.Body>
        <Dialog.Footer
          renderButtons={() => (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button view="flat" size="m" onClick={() => setArtistDialogOpen(false)}>
                {lang === 'ru' ? 'Закрыть' : 'Close'}
              </Button>
              {artistInfo?.content_urls?.desktop?.page && (
                <Button
                  view="outlined"
                  size="m"
                  onClick={() => window.open(artistInfo.content_urls!.desktop.page, '_blank')}
                >
                  Wikipedia
                </Button>
              )}
            </div>
          )}
        />
      </Dialog>
    </Dialog>
  );
}
