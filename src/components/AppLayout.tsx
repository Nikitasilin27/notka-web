import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AsideHeader, FooterItem } from '@gravity-ui/navigation';
import { Icon, DropdownMenu, Button } from '@gravity-ui/uikit';
import { House, Persons, Person, ArrowRightFromSquare, MusicNote, Gear, Bell, BellDot } from '@gravity-ui/icons';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';
import { subscribeToNotifications, markNotificationRead, Notification } from '../services/firebase';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, spotifyId } = useAuth();
  const { t, lang } = useI18n();
  const [compact, setCompact] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Subscribe to notifications
  useEffect(() => {
    if (!spotifyId) return;
    
    const unsubscribe = subscribeToNotifications(spotifyId, (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    
    return () => unsubscribe();
  }, [spotifyId]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markNotificationRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'like' && notification.data.scrobbleId) {
      navigate(`/profile/${notification.fromOdl}`);
    } else if (notification.type === 'follow') {
      navigate(`/profile/${notification.fromOdl}`);
    } else if (notification.type === 'suggestion') {
      navigate(`/profile/${notification.fromOdl}`);
    }
  };

  const formatNotificationText = (notification: Notification): string => {
    const name = notification.fromName;
    
    if (notification.type === 'like') {
      const track = notification.data.trackName || 'track';
      const artist = notification.data.artistName || '';
      const trackInfo = artist ? `${track} — ${artist}` : track;
      return lang === 'ru' 
        ? `${name} лайкнул ваш скроббл "${trackInfo}"`
        : `${name} liked your scrobble "${trackInfo}"`;
    }
    
    if (notification.type === 'follow') {
      return lang === 'ru'
        ? `${name} подписался на вас`
        : `${name} followed you`;
    }
    
    if (notification.type === 'suggestion') {
      const track = notification.data.trackName || 'track';
      const artist = notification.data.artistName || '';
      const trackInfo = artist ? `${track} — ${artist}` : track;
      return lang === 'ru'
        ? `${name} рекомендует вам "${trackInfo}"`
        : `${name} recommended "${trackInfo}" to you`;
    }
    
    return '';
  };

  const renderNotificationsButton = () => {
    const hasUnread = unreadCount > 0;
    
    const dropdownItems = notifications.length > 0 
      ? notifications.slice(0, 10).map(notification => ({
          action: () => handleNotificationClick(notification),
          text: formatNotificationText(notification),
          className: notification.read ? 'notification-read' : 'notification-unread',
        }))
      : [{
          action: () => {},
          text: lang === 'ru' ? 'Нет уведомлений' : 'No notifications',
          disabled: true,
        }];

    return (
      <DropdownMenu
        items={dropdownItems}
        popupProps={{ placement: 'bottom-end' }}
        renderSwitcher={(props) => (
          <Button
            {...props}
            view="flat"
            size="m"
            className="notifications-button"
          >
            <Icon data={hasUnread ? BellDot : Bell} size={18} />
            {hasUnread && <span className="notifications-badge">{unreadCount}</span>}
          </Button>
        )}
      />
    );
  };

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
        <header className="mobile-header">
          <span className="mobile-header-title">Notka</span>
          {renderNotificationsButton()}
        </header>
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
          <DropdownMenu
            items={notifications.length > 0 
              ? notifications.slice(0, 10).map(notification => ({
                  action: () => handleNotificationClick(notification),
                  text: formatNotificationText(notification),
                }))
              : [{
                  action: () => {},
                  text: lang === 'ru' ? 'Нет уведомлений' : 'No notifications',
                  disabled: true,
                }]
            }
            popupProps={{ placement: 'right-start' }}
            renderSwitcher={(props) => (
              <FooterItem
                {...props}
                id="notifications"
                title={lang === 'ru' ? 'Уведомления' : 'Notifications'}
                icon={unreadCount > 0 ? BellDot : Bell}
                iconSize={18}
                compact={isCompact}
                rightAdornment={unreadCount > 0 ? (
                  <span className="notifications-badge-footer">{unreadCount}</span>
                ) : undefined}
              />
            )}
          />
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
