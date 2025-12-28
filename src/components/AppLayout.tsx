import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AsideHeader } from '@gravity-ui/navigation';
import { useAuth } from '../hooks/useAuth';

// Icons as SVG components
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1.5l-6 5v7a.5.5 0 00.5.5h3a.5.5 0 00.5-.5V10h4v3.5a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-7l-6-5z"/>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 8a4 4 0 100-8 4 4 0 000 8zm0 1c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 2v2H3v8h3v2H1V2h5zm4.5 2L14 8l-3.5 4V10H5V6h5.5V4z"/>
  </svg>
);

const LogoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [compact, setCompact] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    {
      id: 'feed',
      title: 'Лента',
      icon: HomeIcon,
      link: '/',
      current: location.pathname === '/',
      onItemClick: () => navigate('/'),
    },
    {
      id: 'users',
      title: 'Слушатели',
      icon: UsersIcon,
      link: '/users',
      current: location.pathname === '/users',
      onItemClick: () => navigate('/users'),
    },
    {
      id: 'profile',
      title: 'Профиль',
      icon: ProfileIcon,
      link: '/profile',
      current: location.pathname.startsWith('/profile'),
      onItemClick: () => navigate('/profile'),
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Mobile: Bottom Tab Bar
  if (isMobile) {
    return (
      <div className="app-mobile">
        <main className="main-content-mobile">{children}</main>
        <nav className="mobile-tab-bar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`tab-bar-item ${item.current ? 'active' : ''}`}
              onClick={item.onItemClick}
            >
              <span className="tab-bar-icon">
                <item.icon />
              </span>
              <span className="tab-bar-label">{item.title}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // Desktop: Aside Header
  return (
    <AsideHeader
      logo={{
        text: 'Notka',
        icon: LogoIcon,
        onClick: () => navigate('/'),
      }}
      compact={compact}
      onChangeCompact={setCompact}
      menuItems={menuItems}
      renderFooter={() => (
        <div className="aside-footer">
          <button className="logout-button" onClick={handleLogout}>
            <LogoutIcon />
            {!compact && <span>Выйти</span>}
          </button>
        </div>
      )}
      renderContent={() => (
        <main className="main-content-desktop">{children}</main>
      )}
    />
  );
}
