// User types - совместимы с iOS приложением
export interface User {
  odl: string; // Spotify ID (document ID)
  name: string;
  avatarURL?: string;
  bio?: string;
  latitude?: number;
  longitude?: number;
  lastUpdated?: Date;
  currentTrack?: CurrentTrack;
}

export interface CurrentTrack {
  trackId: string;
  trackName: string;
  artistName: string;
  albumArtURL?: string;
  timestamp: Date;
}

// Scrobble - совместим с iOS (используем их имена полей)
export interface Scrobble {
  id: string;
  odl: string;           // Spotify ID (для веба)
  userId?: string;       // Firebase Auth UID (для iOS)
  trackId?: string;
  artistId?: string;     // Spotify Artist ID for accurate image fetching
  title: string;         // iOS использует title
  artist: string;        // iOS использует artist  
  album?: string;        // iOS использует album
  albumArtURL?: string;  // веб добавляет обложку
  timestamp: Date;
  scrobbledAt?: Date;    // iOS использует scrobbledAt
  duration?: number;
  // Like fields
  isLikedOnSpotify?: boolean;  // Was this track liked on Spotify when scrobbled
  likesCount?: number;         // Social likes count (updated by Cloud Function)
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
}

export interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  item: SpotifyTrack | null;
  progress_ms: number;
}
