import { SpotifyTokens, SpotifyCurrentlyPlaying, SpotifyTrack } from '../types';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.PROD
  ? import.meta.env.VITE_SPOTIFY_REDIRECT_URI_PROD
  : import.meta.env.VITE_SPOTIFY_REDIRECT_URI_DEV;
const SCOPES = [
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-read-playback-state',
  'user-read-private',
  'user-read-email',
  'user-library-read',   // For checking liked tracks
  'user-library-modify'  // For adding/removing liked tracks
].join(' ');

// PKCE helpers
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Auth functions
export async function initiateSpotifyLogin(): Promise<void> {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);
  
  localStorage.setItem('code_verifier', codeVerifier);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });
  
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const codeVerifier = localStorage.getItem('code_verifier');
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }
  
  const data = await response.json();
  localStorage.removeItem('code_verifier');
  
  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  
  saveTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(): Promise<SpotifyTokens | null> {
  const tokens = getTokens();
  if (!tokens?.refreshToken) return null;
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    }),
  });
  
  if (!response.ok) {
    clearTokens();
    return null;
  }
  
  const data = await response.json();
  const newTokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  
  saveTokens(newTokens);
  return newTokens;
}

// Token storage
export function saveTokens(tokens: SpotifyTokens): void {
  localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
}

export function getTokens(): SpotifyTokens | null {
  const stored = localStorage.getItem('spotify_tokens');
  return stored ? JSON.parse(stored) : null;
}

export function clearTokens(): void {
  localStorage.removeItem('spotify_tokens');
}

// Get valid access token (auto-refresh if needed)
export async function getValidAccessToken(): Promise<string | null> {
  let tokens = getTokens();
  if (!tokens) return null;
  
  // Refresh if expires in less than 5 minutes
  if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    tokens = await refreshAccessToken();
    if (!tokens) return null;
  }
  
  return tokens.accessToken;
}

// Spotify API calls
export async function getCurrentUser(): Promise<{ id: string; display_name: string; images: { url: string }[] } | null> {
  const token = await getValidAccessToken();
  if (!token) return null;
  
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) return null;
  return response.json();
}

export async function getCurrentlyPlaying(): Promise<SpotifyCurrentlyPlaying | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 204) {
    return { is_playing: false, item: null, progress_ms: 0 };
  }

  // Handle rate limiting (429 Too Many Requests)
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 60s
    console.warn(`Spotify API rate limited. Retry after ${waitTime / 1000}s`);
    throw new Error(`RATE_LIMITED:${waitTime}`);
  }

  // Handle other errors
  if (response.status === 401) {
    // Token expired, will be refreshed by getValidAccessToken
    console.log('Token expired, refreshing...');
    return null;
  }

  if (!response.ok) {
    console.error(`Spotify API error: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json();
}

export async function getRecentlyPlayed(limit = 20): Promise<{ items: { track: SpotifyCurrentlyPlaying['item']; played_at: string }[] } | null> {
  const token = await getValidAccessToken();
  if (!token) return null;
  
  const response = await fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) return null;
  return response.json();
}

// Search for artist to get their image
export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
}

// Cache for artist images to avoid repeated API calls
const artistImageCache = new Map<string, string | null>();

export async function getArtistImage(artistName: string): Promise<string | null> {
  const normalizedName = artistName.toLowerCase().trim();
  
  // Check cache first
  const cached = artistImageCache.get(normalizedName);
  if (cached !== undefined) {
    return cached;
  }
  
  const token = await getValidAccessToken();
  if (!token) return null;
  
  try {
    // Search with artist name in quotes for exact match
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(artistName)}"&type=artist&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.ok) {
      artistImageCache.set(normalizedName, null);
      return null;
    }
    
    const data = await response.json();
    const artists = data.artists?.items as SpotifyArtist[] | undefined;
    
    if (!artists || artists.length === 0) {
      artistImageCache.set(normalizedName, null);
      return null;
    }
    
    // Find exact name match (case-insensitive)
    let matchedArtist = artists.find(
      a => a.name.toLowerCase() === normalizedName
    );
    
    // If no exact match, try partial match at start
    if (!matchedArtist) {
      matchedArtist = artists.find(
        a => a.name.toLowerCase().startsWith(normalizedName) ||
             normalizedName.startsWith(a.name.toLowerCase())
      );
    }
    
    // Fallback to first result if nothing else matches
    if (!matchedArtist) {
      matchedArtist = artists[0];
    }
    
    const imageUrl = matchedArtist?.images?.[0]?.url || null;
    
    // Cache the result
    artistImageCache.set(normalizedName, imageUrl);
    
    return imageUrl;
  } catch (error) {
    console.error('Error fetching artist image:', error);
    artistImageCache.set(normalizedName, null);
    return null;
  }
}

// Batch fetch artist images
export async function getArtistImages(artistNames: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  // Process in parallel but with some throttling
  const batchSize = 5;
  for (let i = 0; i < artistNames.length; i += batchSize) {
    const batch = artistNames.slice(i, i + batchSize);
    const promises = batch.map(async (name) => {
      const image = await getArtistImage(name);
      results.set(name, image);
    });
    await Promise.all(promises);
  }
  
  return results;
}

// Get artist by Spotify ID (most accurate)
export async function getArtistById(artistId: string): Promise<SpotifyArtist | null> {
  const token = await getValidAccessToken();
  if (!token) return null;
  
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error fetching artist by ID:', error);
    return null;
  }
}

// Batch get artists by IDs
export async function getArtistsByIds(artistIds: string[]): Promise<Map<string, SpotifyArtist>> {
  const results = new Map<string, SpotifyArtist>();
  const token = await getValidAccessToken();
  if (!token) return results;
  
  // Spotify allows up to 50 artists per request
  const batchSize = 50;
  for (let i = 0; i < artistIds.length; i += batchSize) {
    const batch = artistIds.slice(i, i + batchSize);
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/artists?ids=${batch.join(',')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        for (const artist of data.artists || []) {
          if (artist) {
            results.set(artist.id, artist);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching artists by IDs:', error);
    }
  }
  
  return results;
}

// ============================================
// SPOTIFY ALBUM INFO
// ============================================

export interface SpotifyAlbumInfo {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  release_date: string;
  release_date_precision: string;
  genres: string[];
  label: string;
  total_tracks: number;
  images: { url: string; width: number; height: number }[];
}

/**
 * Get track information to extract album ID
 */
export async function getTrackInfo(trackId: string): Promise<SpotifyTrack | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error fetching track info:', error);
    return null;
  }
}

/**
 * Get album information from Spotify (genres from artist, release date, etc.)
 */
export async function getAlbumInfo(albumId: string): Promise<SpotifyAlbumInfo | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return null;
    const albumData = await response.json();

    // Spotify albums don't have genres, but artists do
    // Fetch genres from the primary artist
    let genres: string[] = [];
    if (albumData.artists?.[0]?.id) {
      const artistData = await getArtistById(albumData.artists[0].id);
      if (artistData?.genres) {
        genres = artistData.genres;
      }
    }

    return {
      ...albumData,
      genres
    };
  } catch (error) {
    console.error('Error fetching album info:', error);
    return null;
  }
}

/**
 * Get album tracks from Spotify
 */
export async function getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  const token = await getValidAccessToken();
  if (!token) return [];

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching album tracks:', error);
    return [];
  }
}

// ============================================
// SPOTIFY LIKED TRACKS
// ============================================

/**
 * Check if tracks are in user's Spotify library (liked)
 * @param trackIds Array of Spotify track IDs
 * @returns Map of trackId -> isLiked
 */
export async function checkTracksLiked(trackIds: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  const token = await getValidAccessToken();
  if (!token) return results;
  
  // Spotify allows up to 50 IDs per request
  const batchSize = 50;
  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize);
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/tracks/contains?ids=${batch.join(',')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data: boolean[] = await response.json();
        batch.forEach((id, index) => {
          results.set(id, data[index] || false);
        });
      }
    } catch (error) {
      console.error('Error checking liked tracks:', error);
    }
  }
  
  return results;
}

/**
 * Check if a single track is liked
 */
export async function isTrackLiked(trackId: string): Promise<boolean> {
  const result = await checkTracksLiked([trackId]);
  return result.get(trackId) || false;
}

/**
 * Add track to Spotify Liked Songs
 */
export async function addTrackToSpotifyLikes(trackId: string): Promise<boolean> {
  const tokens = getTokens();
  if (!tokens) return false;
  
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return false;
      return addTrackToSpotifyLikes(trackId);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error adding track to Spotify likes:', error);
    return false;
  }
}

/**
 * Remove track from Spotify Liked Songs
 */
export async function removeTrackFromSpotifyLikes(trackId: string): Promise<boolean> {
  const tokens = getTokens();
  if (!tokens) return false;
  
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return false;
      return removeTrackFromSpotifyLikes(trackId);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error removing track from Spotify likes:', error);
    return false;
  }
}
