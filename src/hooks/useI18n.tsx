import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'ru' | 'en';

interface Translations {
  // Navigation
  feed: string;
  following: string;
  listeners: string;
  profile: string;
  logout: string;

  // Feed
  nowPlaying: string;
  allScrobbles: string;
  followingTab: string;
  noScrobbles: string;
  noFollowingScrobbles: string;
  followSomeone: string;

  // Users
  listenersTitle: string;
  noListeners: string;
  inviteFriends: string;
  sendLink: string;
  offline: string;

  // Profile
  scrobbles: string;
  artists: string;
  tracks: string;
  followers: string;
  followingCount: string;
  follow: string;
  unfollow: string;
  settings: string;
  darkTheme: string;
  language: string;
  recentTracks: string;
  likedTracks: string;
  userNotFound: string;
  turnOnSpotify: string;
  topArtists: string;
  topAlbums: string;
  noLikedTracks: string;
  searchTracks: string;

  // Time
  justNow: string;
  minAgo: string;
  hAgo: string;
  dAgo: string;

  // Languages
  russian: string;
  english: string;

  // Login page
  loginSubtitle: string;
  signInSpotify: string;
  comingSoon: string;
  loginHint: string;

  // Toasts/Notifications
  errorOccurred: string;
  somethingWrong: string;
  welcomeToNotka: string;
  liked: string;
  failedToLike: string;
  failedToUnlike: string;

  // PWA
  installTitle: string;
  installBody: string;
  installButton: string;
  installIosHint: string;
  later: string;
  updateAvailable: string;
  updateAction: string;
}

const translations: Record<Language, Translations> = {
  ru: {
    // Navigation
    feed: 'Лента',
    following: 'Подписки',
    listeners: 'Слушатели',
    profile: 'Профиль',
    logout: 'Выйти',

    // Feed
    nowPlaying: 'Сейчас играет',
    allScrobbles: 'Все',
    followingTab: 'Подписки',
    noScrobbles: 'Пока нет скробблов',
    noFollowingScrobbles: 'Нет скробблов от подписок',
    followSomeone: 'Подпишись на кого-нибудь в разделе "Слушатели"',

    // Users
    listenersTitle: 'Слушатели',
    noListeners: 'Пока никого нет. Пригласи друзей!',
    inviteFriends: 'Пригласи друзей!',
    sendLink: 'Отправь им ссылку',
    offline: 'Не в сети',

    // Profile
    scrobbles: 'скробблов',
    artists: 'исполнителей',
    tracks: 'треков',
    followers: 'подписчиков',
    followingCount: 'подписок',
    follow: 'Подписаться',
    unfollow: 'Отписаться',
    settings: 'Настройки',
    darkTheme: 'Тёмная тема',
    language: 'Язык',
    recentTracks: 'Недавние треки',
    likedTracks: 'Понравившиеся',
    userNotFound: 'Пользователь не найден',
    turnOnSpotify: 'Включи музыку в Spotify!',
    topArtists: 'Топ исполнителей',
    topAlbums: 'Топ альбомов',
    noLikedTracks: 'Нет понравившихся треков',
    searchTracks: 'Поиск треков...',

    // Time
    justNow: 'только что',
    minAgo: 'мин назад',
    hAgo: 'ч назад',
    dAgo: 'д назад',

    // Languages
    russian: 'Русский',
    english: 'English',

    // Login page
    loginSubtitle:
      'Находи единомышленников по музыкальным вкусам, делись скробблами и открывай новую музыку вместе',
    signInSpotify: 'Войти со Spotify',
    comingSoon: 'Скоро',
    loginHint:
      'Apple Music и Яндекс Музыка в разработке. Вход через Spotify недоступен из России без VPN.',

    // Toasts/Notifications
    errorOccurred: 'Произошла ошибка',
    somethingWrong: 'Что-то пошло не так. Пожалуйста, обнови страницу.',
    welcomeToNotka:
      'Добро пожаловать в Notka! 🎵 Включи музыку в Spotify, чтобы начать скробблинг.',
    liked: 'Понравилось!',
    failedToLike: 'Не удалось добавить в избранное',
    failedToUnlike: 'Не удалось убрать из избранного',

    // PWA
    installTitle: 'Установи Notka',
    installBody: 'Добавь на главный экран — быстрый запуск и работа офлайн.',
    installButton: 'Установить',
    installIosHint: 'Нажми «Поделиться» → «На экран «Домой»».',
    later: 'Позже',
    updateAvailable: 'Доступно обновление Notka',
    updateAction: 'Обновить',
  },
  en: {
    // Navigation
    feed: 'Feed',
    following: 'Following',
    listeners: 'Listeners',
    profile: 'Profile',
    logout: 'Logout',

    // Feed
    nowPlaying: 'Now Playing',
    allScrobbles: 'All',
    followingTab: 'Following',
    noScrobbles: 'No scrobbles yet',
    noFollowingScrobbles: 'No scrobbles from following',
    followSomeone: 'Follow someone in the "Listeners" section',

    // Users
    listenersTitle: 'Listeners',
    noListeners: 'No one here yet. Invite friends!',
    inviteFriends: 'Invite friends!',
    sendLink: 'Send them link',
    offline: 'Offline',

    // Profile
    scrobbles: 'scrobbles',
    artists: 'artists',
    tracks: 'tracks',
    followers: 'followers',
    followingCount: 'following',
    follow: 'Follow',
    unfollow: 'Unfollow',
    settings: 'Settings',
    darkTheme: 'Dark theme',
    language: 'Language',
    recentTracks: 'Recent tracks',
    likedTracks: 'Liked tracks',
    userNotFound: 'User not found',
    turnOnSpotify: 'Turn on music in Spotify!',
    topArtists: 'Top Artists',
    topAlbums: 'Top Albums',
    noLikedTracks: 'No liked tracks yet',
    searchTracks: 'Search tracks...',

    // Time
    justNow: 'just now',
    minAgo: 'min ago',
    hAgo: 'h ago',
    dAgo: 'd ago',

    // Languages
    russian: 'Русский',
    english: 'English',

    // Login page
    loginSubtitle:
      'Find like-minded music lovers, share scrobbles, and discover new music together',
    signInSpotify: 'Sign in with Spotify',
    comingSoon: 'Coming soon',
    loginHint:
      'Apple Music and Yandex Music are coming soon. Spotify login is not available from Russia without VPN.',

    // Toasts/Notifications
    errorOccurred: 'An error occurred',
    somethingWrong: 'Something went wrong. Please refresh the page.',
    welcomeToNotka: 'Welcome to Notka! 🎵 Play music on Spotify to start scrobbling.',
    liked: 'Liked!',
    failedToLike: 'Failed to like',
    failedToUnlike: 'Failed to unlike',

    // PWA
    installTitle: 'Install Notka',
    installBody: 'Add it to your home screen for quick launch and offline use.',
    installButton: 'Install',
    installIosHint: 'Tap Share → Add to Home Screen.',
    later: 'Later',
    updateAvailable: 'A new version of Notka is available',
    updateAction: 'Reload',
  },
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('notka-language');
    return (saved as Language) || 'ru';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('notka-language', newLang);
  };

  const t = translations[lang];

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Helper for time formatting
export function formatTimeI18n(date: Date, t: Translations): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t.justNow;
  if (minutes < 60) return `${minutes} ${t.minAgo}`;
  if (hours < 24) return `${hours} ${t.hAgo}`;
  if (days < 7) return `${days} ${t.dAgo}`;
  return date.toLocaleDateString();
}
