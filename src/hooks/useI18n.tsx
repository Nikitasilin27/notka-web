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
  userNotFound: string;
  turnOnSpotify: string;
  
  // Time
  justNow: string;
  minAgo: string;
  hAgo: string;
  dAgo: string;
  
  // Languages
  russian: string;
  english: string;
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
    recentTracks: 'Последние треки',
    userNotFound: 'Пользователь не найден',
    turnOnSpotify: 'Включи музыку в Spotify!',
    
    // Time
    justNow: 'только что',
    minAgo: 'мин назад',
    hAgo: 'ч назад',
    dAgo: 'д назад',
    
    // Languages
    russian: 'Русский',
    english: 'English',
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
    userNotFound: 'User not found',
    turnOnSpotify: 'Turn on music in Spotify!',
    
    // Time
    justNow: 'just now',
    minAgo: 'min ago',
    hAgo: 'h ago',
    dAgo: 'd ago',
    
    // Languages
    russian: 'Русский',
    english: 'English',
  }
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

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
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
