import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AsideHeader, FooterItem } from '@gravity-ui/navigation';
import { Icon, Button, Popover, Dialog, DropdownMenu } from '@gravity-ui/uikit';
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
  const [showAllNotifsDialog, setShowAllNotifsDialog] = useState(false);

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
    setShowAllNotifsDialog(false);
    
    // Navigate based on notification type
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
    if (spotifyId) {
      await markAllNotificationsRead(spotifyId);
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

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return lang === 'ru' ? 'только что' : 'just now';
    if (diffMins < 60) return lang === 'ru' ? `${diffMins} мин назад` : `${diffMins}m ago`;
    if (diffHours < 24) return lang === 'ru' ? `${diffHours} ч назад` : `${diffHours}h ago`;
    return lang === 'ru' ? `${diffDays} д назад` : `${diffDays}d ago`;
  };

  const renderNotificationItem = (notification: Notification, showActions = true) => (
    <div 
      key={notification.id}
      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
      onClick={() => handleNotificationClick(notification)}
    >
      {notification.fromAvatar ? (
        <img src={notification.fromAvatar} alt="" className="notification-avatar" />
      ) : (
        <div className="notification-avatar notification-avatar-placeholder">
          {notification.fromName?.charAt(0) || '?'}
        </div>
      )}
      <div className="notification-content">
        <div className="notification-text">{formatNotificationText(notification)}</div>
        <div className="notification-time">{formatTimeAgo(notification.timestamp)}</div>
      </div>
      {showActions && (
        <div className="notification-actions">
          {!notification.read && (
            <button 
              className="notification-action-btn" 
              onClick={(e) => handleMarkRead(e, notification)}
              title={lang === 'ru' ? 'Прочитано' : 'Mark read'}
            >
              <Icon data={Check} size={14} />
            </button>
          )}
          <button 
            className="notification-action-btn notification-delete" 
            onClick={(e) => handleDelete(e, notification)}
            title={lang === 'ru' ? 'Удалить' : 'Delete'}
          >
            <Icon data={Xmark} size={14} />
          </button>
        </div>
      )}
    </div>
  );

  const renderNotificationsButton = () => {
    const hasUnread = unreadCount > 0;
    const displayNotifications = notifications.slice(0, 8);

    const notificationsContent = (
      <div className="notifications-popup">
        <div className="notifications-header">
          <span>{lang === 'ru' ? 'Уведомления' : 'Notifications'}</span>
          {unreadCount > 0 && (
            <button className="notifications-mark-all" onClick={handleMarkAllRead}>
              {lang === 'ru' ? 'Прочитать все' : 'Mark all read'}
            </button>
          )}
        </div>
        
        <div className="notifications-list">
          {displayNotifications.length > 0 ? (
            displayNotifications.map(n => renderNotificationItem(n))
          ) : (
            <div className="notifications-empty">
              {lang === 'ru' ? 'Нет уведомлений' : 'No notifications'}
            </div>
          )}
        </div>
        
        {notifications.length > 8 && (
          <button 
            className="notifications-more"
            onClick={() => setShowAllNotifsDialog(true)}
          >
            {lang === 'ru' ? 'Показать все' : 'Show all'} ({notifications.length})
          </button>
        )}
      </div>
    );

    return (
      <>
        <Popover
          content={notificationsContent}
          placement="bottom-end"
          hasArrow={false}
        >
          <Button
            view="flat"
            size="m"
            className="notifications-button"
          >
            <Icon data={hasUnread ? BellDot : Bell} size={18} />
            {hasUnread && <span className="notifications-badge">{unreadCount}</span>}
          </Button>
        </Popover>

        <Dialog
          open={showAllNotifsDialog}
          onClose={() => setShowAllNotifsDialog(false)}
          size="m"
        >
          <Dialog.Header caption={lang === 'ru' ? 'Все уведомления' : 'All notifications'} />
          <Dialog.Body>
            <div className="notifications-dialog-list">
              {notifications.map(n => renderNotificationItem(n))}
            </div>
          </Dialog.Body>
        </Dialog>
      </>
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
            renderSwitcher={(props: Record<string, unknown>) => (
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
