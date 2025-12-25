import { Link } from 'react-router-dom';
import { Scrobble, User } from '../types';

interface ScrobbleCardProps {
  scrobble: Scrobble;
  user?: User;
  timeAgo: string;
  showUser?: boolean;
}

export function ScrobbleCard({ scrobble, user, timeAgo, showUser = true }: ScrobbleCardProps) {
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
        <div className="scrobble-track">{scrobble.title}</div>
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
      
      <div className="scrobble-time">{timeAgo}</div>
    </div>
  );
}
