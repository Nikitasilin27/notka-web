import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AsideHeader, FooterItem } from '@gravity-ui/navigation';
import { Icon } from '@gravity-ui/uikit';
import { House, Persons, Person, ArrowRightFromSquare, MusicNote, Gear } from '@gravity-ui/icons';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { t } = useI18n();
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
      title: t.feed,
      icon: House,
      iconSize: 18,
      link: '/',
      current: location.pathname === '/',
      onItemClick: () => navigate('/'),
    },
    {
      id: 'users',
      title: t.listeners,
      icon: Persons,
      iconSize: 18,
      link: '/users',
      current: location.pathname === '/users',
      onItemClick: () => navigate('/users'),
    },
    {
      id: 'profile',
      title: t.profile,
      icon: Person,
      iconSize: 18,
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
                <Icon data={item.icon} size={24} />
              </span>
              <span className="tab-bar-label">{item.title}</span>
            </button>
          ))}
          <button
            className={`tab-bar-item ${location.pathname === '/settings' ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            <span className="tab-bar-icon">
              <Icon data={Gear} size={24} />
            </span>
            <span className="tab-bar-label">{t.settings}</span>
          </button>
        </nav>
      </div>
    );
  }

  // Desktop: Aside Header
  return (
    <AsideHeader
      logo={{
        text: 'Notka',
        icon: MusicNote,
        iconSize: 24,
        onClick: () => navigate('/'),
      }}
      compact={compact}
      onChangeCompact={setCompact}
      headerDecoration={true}
      menuItems={menuItems}
      renderFooter={({ compact: isCompact }) => (
        <>
          <FooterItem
            id="settings"
            title={t.settings}
            icon={Gear}
            iconSize={18}
            current={location.pathname === '/settings'}
            onItemClick={() => navigate('/settings')}
            compact={isCompact}
          />
          <FooterItem
            id="logout"
            title={t.logout}
            icon={ArrowRightFromSquare}
            iconSize={18}
            onItemClick={handleLogout}
            compact={isCompact}
          />
        </>
      )}
      renderContent={() => (
        <main className="main-content-desktop">{children}</main>
      )}
    />
  );
}
