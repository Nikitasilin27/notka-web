import { useState, useEffect } from 'react';
import { Icon, Label, Link } from '@gravity-ui/uikit';
import { Heart, HeartFill } from '@gravity-ui/icons';
import { Scrobble, User } from '../types';
import { TrackDialog } from './TrackDialog';

// Custom Spotify icon SVG - centered with brand color
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="#1DB954">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// Music note placeholder icon
const MusicNotePlaceholder = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" opacity="0.4">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

interface ScrobbleCardProps {
  scrobble: Scrobble;
  user?: User;
  timeAgo: string;
  showUser?: boolean;
  // Like props
  isLiked?: boolean;
  onLike?: () => Promise<void>;
  onUnlike?: () => Promise<void>;
  canLike?: boolean;
  lang?: string;
  // Show "В любимом" badge only on own profile
  showSpotifyLiked?: boolean;
  // Show LIVE badge for recent scrobbles (< 1 minute)
  showLiveBadge?: boolean;
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
  lang = 'ru',
  showSpotifyLiked = false,
  showLiveBadge = false
}: ScrobbleCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikesCount, setLocalLikesCount] = useState(scrobble.likesCount || 0);
  const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false);

  // Sync localLiked with prop when it changes
  useEffect(() => {
    setLocalLiked(isLiked);
  }, [isLiked]);

  // Sync likesCount with prop
  useEffect(() => {
    setLocalLikesCount(scrobble.likesCount || 0);
  }, [scrobble.likesCount]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    
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

  const hasLikeButton = (onLike || onUnlike) && canLike;

  const handleCardClick = () => {
    if (scrobble.trackId) {
      setIsTrackDialogOpen(true);
    }
  };

  return (
    <>
      <div className="scrobble-card" onClick={handleCardClick} style={{ cursor: scrobble.trackId ? 'pointer' : 'default' }}>
        {/* Album Art */}
        <div className="scrobble-art-container">
        {scrobble.albumArtURL ? (
          <img 
            src={scrobble.albumArtURL} 
            alt={scrobble.album || scrobble.title}
            className="scrobble-art"
          />
        ) : (
          <div className="scrobble-art scrobble-art-placeholder">
            <MusicNotePlaceholder />
          </div>
        )}
      </div>

      {/* Like Button - between image and info (like Last.fm) */}
      {hasLikeButton ? (
        <button 
          className={`scrobble-like-btn ${localLiked ? 'liked' : ''} ${isLiking ? 'loading' : ''}`}
          onClick={handleLikeClick}
          disabled={isLiking}
          title={localLiked 
            ? (lang === 'ru' ? 'Убрать лайк' : 'Unlike') 
            : (lang === 'ru' ? 'Нравится' : 'Like')
          }
        >
          <Icon data={localLiked ? HeartFill : Heart} size={16} />
        </button>
      ) : (
        // Show static likes count if no like button
        localLikesCount > 0 && (
          <span className="scrobble-likes-static">
            <Icon data={HeartFill} size={14} />
          </span>
        )
      )}
      
      {/* Track Info */}
      <div className="scrobble-info">
        <div className="scrobble-track-row">
          <span className="scrobble-track">{scrobble.title}</span>
          {showLiveBadge && (
            <Label size="xs" theme="utility">
              LIVE
            </Label>
          )}
          {showSpotifyLiked && scrobble.isLikedOnSpotify && (
            <Label
              size="xs"
              theme="normal"
              className="spotify-liked-label"
            >
              <span className="spotify-label-content">
                {lang === 'ru' ? 'В любимом' : 'Liked'}
                <SpotifyIcon />
              </span>
            </Label>
          )}
        </div>
        <div className="scrobble-artist">{scrobble.artist}</div>

        {showUser && user && (
          <div onClick={(e) => e.stopPropagation()}>
            <Link href={`/profile/${user.odl}`} className="scrobble-user">
              <img
                src={user.avatarURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23666"/></svg>'}
                alt={user.name}
                className="scrobble-user-avatar"
              />
              {user.name}
            </Link>
          </div>
        )}
      </div>
      
      {/* Likes Count + Time */}
      <div className="scrobble-meta">
        {localLikesCount > 0 && (
          <span className="scrobble-likes-count">
            <Icon data={HeartFill} size={12} />
            {localLikesCount}
          </span>
        )}
        <span className="scrobble-time">{timeAgo}</span>
      </div>
    </div>

    {/* Track Dialog */}
    <TrackDialog
      trackId={scrobble.trackId || null}
      trackName={scrobble.title}
      artistName={scrobble.artist}
      albumArtURL={scrobble.albumArtURL}
      scrobble={scrobble}
      isLiked={localLiked}
      open={isTrackDialogOpen}
      onClose={() => setIsTrackDialogOpen(false)}
      lang={lang as 'ru' | 'en'}
    />
    </>
  );
}
