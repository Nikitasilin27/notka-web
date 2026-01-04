import { useLocation } from 'react-router-dom';
import { Button, Link } from '@gravity-ui/uikit';
import { useAuth } from '../hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="header">
      <Link href="/" className="header-logo">
        🎵 Notka
      </Link>

      <nav className="header-nav">
        <Button
          view={location.pathname === '/' ? 'outlined-info' : 'flat'}
          size="m"
          href="/"
        >
          Лента
        </Button>
        <Button
          view={location.pathname === '/users' ? 'outlined-info' : 'flat'}
          size="m"
          href="/users"
        >
          Слушатели
        </Button>
        <Button
          view={location.pathname === '/profile' ? 'outlined-info' : 'flat'}
          size="m"
          href="/profile"
        >
          Профиль
        </Button>
      </nav>

      <div className="header-user">
        {user && (
          <>
            <img 
              src={user.avatarURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23666"/></svg>'} 
              alt={user.name}
              style={{ width: 32, height: 32, borderRadius: '50%' }}
            />
            <Button view="flat" size="m" onClick={logout}>
              Выйти
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
