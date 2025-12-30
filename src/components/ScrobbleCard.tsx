import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, Tooltip } from '@gravity-ui/uikit';
import { Heart, HeartFill } from '@gravity-ui/icons';
import { Scrobble, User } from '../types';

interface ScrobbleCardProps {
  scrobble: Scrobble;
  user?: User;
  timeAgo: string;
  showUser?: boolean;
  // Like props
  isLiked?: boolean;
  onLike?: () => Promise<void>;
  onUnlike?: () => Promise<void>;
  canLike?: boolean; // false for own scrobbles
  lang?: string;
}

export function ScrobbleCard({ 
  scrobble, 
  user, 
  timeAgo, 
  showUser = true,
  isLiked = false,
  onLike,
  onUnlike,
  canLike = true,
  lang = 'ru'
}: ScrobbleCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikesCount, setLocalLikesCount] = useState(scrobble.likesCount || 0);

  const handleLikeClick = async () => {
    if (isLiking || !canLike) return;
    
    setIsLiking(true);
    try {
      if (localLiked) {
        await onUnlike?.();
        setLocalLiked(false);
        setLocalLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await onLike?.();
        setLocalLiked(true);
        setLocalLikesCount(prev => prev + 1);
      }
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="scrobble-card">
      {scrobble.albumArtURL ? (
        <img 
          src={scrobble.albumArtURL} 
          alt={scrobble.album || scrobble.title}
          className="scrobble-art"
        />
      ) : (
        <div className="scrobble-art" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--g-color-base-generic)',
          fontSize: 20
        }}>
          🎵
        </div>
      )}
      
      <div className="scrobble-info">
        <div className="scrobble-track">
          {scrobble.title}
          {scrobble.isLikedOnSpotify && (
            <Tooltip content={lang === 'ru' ? 'Лайк в Spotify' : 'Liked on Spotify'}>
              <span className="spotify-like-badge" title="Liked on Spotify">💚</span>
            </Tooltip>
          )}
        </div>
        <div className="scrobble-artist">{scrobble.artist}</div>
        
        {showUser && user && (
          <Link to={`/profile/${user.odl}`} className="scrobble-user">
            <img 
              src={user.avatarURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23666"/></svg>'} 
              alt={user.name}
              style={{ width: 20, height: 20, borderRadius: '50%' }}
            />
            {user.name}
          </Link>
        )}
      </div>
      
      <div className="scrobble-actions">
        {canLike && (onLike || onUnlike) && (
          <button 
            className={`like-button ${localLiked ? 'liked' : ''} ${isLiking ? 'loading' : ''}`}
            onClick={handleLikeClick}
            disabled={isLiking}
            title={localLiked 
              ? (lang === 'ru' ? 'Убрать лайк' : 'Unlike') 
              : (lang === 'ru' ? 'Нравится' : 'Like')
            }
          >
            <Icon data={localLiked ? HeartFill : Heart} size={16} />
            {localLikesCount > 0 && (
              <span className="likes-count">{localLikesCount}</span>
            )}
          </button>
        )}
        {!canLike && localLikesCount > 0 && (
          <span className="likes-count-static">
            <Icon data={HeartFill} size={14} />
            {localLikesCount}
          </span>
        )}
      </div>
      
      <div className="scrobble-time">{timeAgo}</div>
    </div>
  );
}
