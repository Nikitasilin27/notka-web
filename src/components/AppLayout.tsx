import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AsideHeader, FooterItem } from '@gravity-ui/navigation';
import { Icon, Button } from '@gravity-ui/uikit';
import { House, Persons, Person, ArrowRightFromSquare, MusicNote, Gear, Bell, BellDot, Check, Xmark } from '@gravity-ui/icons';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';
import { subscribeToNotifications, markNotificationRead, deleteNotification, markAllNotificationsRead, Notification } from '../services/firebase';

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
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

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
    setNotifPanelOpen(false);
    
    if (notification.type === 'like' && notification.data.scrobbleId) {
      navigate(`/profile/${notification.fromOdl}`);
    } else if (notification.type === 'follow') {
      navigate(`/profile/${notification.fromOdl}`);
    } else if (notification.type === 'suggestion') {
      navigate(`/profile/${notification.fromOdl}`);
    }
  };

  const handleMarkRead = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    await markNotificationRead(notification.id);
  };

  const handleDelete = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    await deleteNotification(notification.id);
  };

  const handleMarkAllRead = async () => {
    if (!spotifyId) return;
    await markAllNotificationsRead(spotifyId);
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return lang === 'ru' ? 'сейчас' : 'now';
    if (minutes < 60) return lang === 'ru' ? `${minutes} мин` : `${minutes}m`;
    if (hours < 24) return lang === 'ru' ? `${hours} ч` : `${hours}h`;
    return lang === 'ru' ? `${days} д` : `${days}d`;
  };

  const getNotificationText = (notification: Notification): string => {
    const name = notification.fromName || notification.fromOdl;
    switch (notification.type) {
      case 'like':
        return lang === 'ru' 
          ? `${name} понравился трек "${notification.data.trackName}"`
          : `${name} liked "${notification.data.trackName}"`;
      case 'follow':
        return lang === 'ru'
          ? `${name} подписался на вас`
          : `${name} started following you`;
      case 'suggestion':
        return lang === 'ru'
          ? `${name} рекомендует "${notification.data.trackName}"`
          : `${name} recommends "${notification.data.trackName}"`;
      default:
        return '';
    }
  };

  // Render notifications panel content
  const renderNotificationsPanel = () => (
    <div className="notifications-panel">
      <div className="notifications-panel-header">
        <h3>{lang === 'ru' ? 'Уведомления' : 'Notifications'}</h3>
        {unreadCount > 0 && (
          <Button view="flat" size="s" onClick={handleMarkAllRead}>
            {lang === 'ru' ? 'Прочитать все' : 'Mark all read'}
          </Button>
        )}
      </div>
      
      <div className="notifications-panel-list">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={`notification-item ${!n.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(n)}
            >
              {n.fromAvatar ? (
                <img src={n.fromAvatar} alt="" className="notification-avatar" />
              ) : (
                <div className="notification-avatar notification-avatar-placeholder">
                  {(n.fromName || n.fromOdl).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="notification-content">
                <div className="notification-text">{getNotificationText(n)}</div>
                <div className="notification-time">{formatTimeAgo(n.timestamp)}</div>
              </div>
              {!n.read && (
                <div className="notification-actions">
                  <button 
                    className="notification-action-btn"
                    onClick={(e) => handleMarkRead(e, n)}
                  >
                    <Icon data={Check} size={14} />
                  </button>
                  <button 
                    className="notification-action-btn"
                    onClick={(e) => handleDelete(e, n)}
                  >
                    <Icon data={Xmark} size={14} />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="notifications-empty">
            {lang === 'ru' ? 'Нет уведомлений' : 'No notifications'}
          </div>
        )}
      </div>
    </div>
  );

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

  // Mobile notification button
  const renderMobileNotificationsButton = () => {
    const hasUnread = unreadCount > 0;
    
    return (
      <Button
        view="flat"
        size="m"
        className="notifications-button"
        onClick={() => setNotifPanelOpen(!notifPanelOpen)}
      >
        <Icon data={hasUnread ? BellDot : Bell} size={18} />
        {hasUnread && <span className="notifications-badge">{unreadCount}</span>}
      </Button>
    );
  };

  // Mobile: Bottom Tab Bar
  if (isMobile) {
    return (
      <div className="app-mobile">
        <header className="mobile-header">
          <span className="mobile-header-title">Notka</span>
          {renderMobileNotificationsButton()}
        </header>
        
        {/* Mobile notifications panel */}
        {notifPanelOpen && (
          <div className="mobile-notifications-overlay" onClick={() => setNotifPanelOpen(false)}>
            <div className="mobile-notifications-panel" onClick={e => e.stopPropagation()}>
              {renderNotificationsPanel()}
            </div>
          </div>
        )}
        
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

  // Desktop: AsideHeader with custom notification panel
  return (
    <>
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
              id="notifications"
              title={lang === 'ru' ? 'Уведомления' : 'Notifications'}
              icon={unreadCount > 0 ? BellDot : Bell}
              iconSize={18}
              current={notifPanelOpen}
              onItemClick={() => setNotifPanelOpen(!notifPanelOpen)}
              compact={isCompact}
              enableTooltip={true}
              rightAdornment={unreadCount > 0 ? (
                <span className="notifications-badge-menu">{unreadCount}</span>
              ) : undefined}
            />
            <FooterItem
              id="settings"
              title={t.settings}
              icon={Gear}
              iconSize={18}
              current={location.pathname === '/settings'}
              onItemClick={() => navigate('/settings')}
              compact={isCompact}
              enableTooltip={true}
            />
            <FooterItem
              id="logout"
              title={t.logout}
              icon={ArrowRightFromSquare}
              iconSize={18}
              onItemClick={handleLogout}
              compact={isCompact}
              enableTooltip={true}
            />
          </>
        )}
        renderContent={() => (
          <main className="main-content">{children}</main>
        )}
      />
      
      {/* Custom desktop notification panel - positioned next to sidebar */}
      {notifPanelOpen && (
        <>
          <div className="desktop-notif-overlay" onClick={() => setNotifPanelOpen(false)} />
          <div className="desktop-notif-panel">
            {renderNotificationsPanel()}
          </div>
        </>
      )}
    </>
  );
}
