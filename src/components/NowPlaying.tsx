import { Skeleton, Icon } from '@gravity-ui/uikit';
import { Heart, HeartFill } from '@gravity-ui/icons';
import { SpotifyCurrentlyPlaying } from '../types';
import { useI18n } from '../hooks/useI18n';

interface NowPlayingProps {
  currentlyPlaying: SpotifyCurrentlyPlaying | null;
  isLoading?: boolean;
  isLiked?: boolean;
  onLike?: () => void;
  onUnlike?: () => void;
  canLike?: boolean;
}

export function NowPlaying({ currentlyPlaying, isLoading, isLiked, onLike, onUnlike, canLike }: NowPlayingProps) {
  const { lang } = useI18n();
  
  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked && onUnlike) {
      onUnlike();
    } else if (!isLiked && onLike) {
      onLike();
    }
  };
  
  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="now-playing">
        <Skeleton className="now-playing-art" style={{ width: 56, height: 56 }} />
        <div className="now-playing-info" style={{ flex: 1 }}>
          <Skeleton style={{ width: '70%', height: 18, marginBottom: 6 }} />
          <Skeleton style={{ width: '50%', height: 14 }} />
        </div>
      </div>
    );
  }
  
  if (!currentlyPlaying?.item) {
    return (
      <div className="now-playing">
        <div className="now-playing-art" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--g-color-base-generic)',
          fontSize: 24
        }}>
          🎵
        </div>
        <div className="now-playing-info">
          <div className="now-playing-track">
            {lang === 'ru' ? 'Ничего не играет' : 'Nothing playing'}
          </div>
          <div className="now-playing-artist">
            {lang === 'ru' ? 'Включи музыку в Spotify' : 'Play music on Spotify'}
          </div>
        </div>
      </div>
    );
  }

  const track = currentlyPlaying.item;
  const albumArt = track.album.images[0]?.url;

  return (
    <div className="now-playing">
      {albumArt ? (
        <img src={albumArt} alt={track.album.name} className="now-playing-art" />
      ) : (
        <div className="now-playing-art" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--g-color-base-generic)',
          fontSize: 24
        }}>
          🎵
        </div>
      )}
      
      {/* Like button */}
      {canLike && (
        <button
          className={`now-playing-like-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLikeClick}
          title={isLiked ? (lang === 'ru' ? 'Убрать из понравившихся' : 'Remove from likes') : (lang === 'ru' ? 'Добавить в понравившиеся' : 'Add to likes')}
        >
          <Icon data={isLiked ? HeartFill : Heart} size={18} />
        </button>
      )}
      
      <div className="now-playing-info">
        <div className="now-playing-track">{track.name}</div>
        <div className="now-playing-artist">
          {track.artists.map(a => a.name).join(', ')}
        </div>
      </div>
      <div className="now-playing-status">
        {currentlyPlaying.is_playing && (
          <>
            <span className="now-playing-pulse" />
            {lang === 'ru' ? 'Сейчас играет' : 'Now playing'}
          </>
        )}
      </div>
    </div>
  );
}
