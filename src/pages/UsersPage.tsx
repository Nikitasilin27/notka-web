import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader } from '@gravity-ui/uikit';
import { getAllUsers } from '../services/firebase';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';

export function UsersPage() {
  const { spotifyId } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [spotifyId]);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers(50);
      // Show all users except current user
      const filtered = data.filter(u => u.odl !== spotifyId);
      setUsers(filtered);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <Loader size="l" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">{t.listenersTitle}</h1>
      
      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p>{t.noListeners}</p>
          <p style={{ fontSize: 14, marginTop: 8, opacity: 0.7 }}>
            {t.sendLink}: notka-mvp.web.app
          </p>
        </div>
      ) : (
        <div className="listeners-list">
          {users.map((user) => (
            <Link 
              key={user.odl} 
              to={`/profile/${user.odl}`}
              className="listener-card"
            >
              {/* Background blur from album art */}
              {user.currentTrack?.albumArtURL && (
                <div 
                  className="listener-card-bg"
                  style={{ backgroundImage: `url(${user.currentTrack.albumArtURL})` }}
                />
              )}
              
              <div className="listener-card-content">
                <img 
                  src={user.avatarURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23555"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">👤</text></svg>'} 
                  alt={user.name}
                  className="listener-avatar"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23555"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">👤</text></svg>';
                  }}
                />
                
                <div className="listener-info">
                  <div className="listener-name">{user.name}</div>
                  {user.currentTrack ? (
                    <div className="listener-track">
                      <span className="listener-pulse" />
                      <span className="listener-track-text">
                        {user.currentTrack.trackName} — {user.currentTrack.artistName}
                      </span>
                    </div>
                  ) : (
                    <div className="listener-offline">
                      {t.offline}
                    </div>
                  )}
                </div>

                {user.currentTrack?.albumArtURL && (
                  <img 
                    src={user.currentTrack.albumArtURL}
                    alt=""
                    className="listener-album-art"
                  />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
