import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader } from '@gravity-ui/uikit';
import { getAllUsers } from '../services/firebase';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';

export function UsersPage() {
  const { spotifyId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers(50);
      // Filter out current user
      setUsers(data.filter(u => u.odl !== spotifyId));
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
      <h1 className="page-title">Слушатели</h1>
      
      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p>Пока никого нет. Пригласи друзей!</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map((user) => (
            <Link 
              key={user.odl} 
              to={`/profile/${user.odl}`}
              className="user-card"
            >
              <img 
                src={user.avatarURL || '/default-avatar.png'} 
                alt={user.name}
                className="user-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23333"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">👤</text></svg>';
                }}
              />
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                {user.currentTrack && (
                  <div className="user-listening">
                    <span className="now-playing-pulse" />
                    {user.currentTrack.trackName}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
