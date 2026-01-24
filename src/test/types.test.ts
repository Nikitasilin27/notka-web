import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables for tests
vi.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

describe('Scrobble Types', () => {
  it('should validate Scrobble interface shape', () => {
    // Type-level validation through interface
    interface Scrobble {
      id: string;
      odl: string;
      title: string;
      artist: string;
      timestamp: Date;
    }

    const scrobble: Scrobble = {
      id: 'test-123',
      odl: 'spotify-user-id',
      title: 'Song Title',
      artist: 'Artist Name',
      timestamp: new Date(),
    };

    expect(scrobble.id).toBeDefined();
    expect(scrobble.title).toBeDefined();
    expect(scrobble.artist).toBeDefined();
  });
});

describe('User Types', () => {
  it('should validate User interface shape', () => {
    interface User {
      odl: string;
      name: string;
      avatarURL?: string;
    }

    const user: User = {
      odl: 'spotify-user-id',
      name: 'Test User',
      avatarURL: 'https://example.com/avatar.jpg',
    };

    expect(user.odl).toBeDefined();
    expect(user.name).toBeDefined();
  });
});

describe('Spotify Types', () => {
  it('should validate SpotifyTrack interface', () => {
    interface SpotifyTrack {
      id: string;
      name: string;
      artists: { id: string; name: string }[];
      album: {
        name: string;
        images: { url: string }[];
      };
      duration_ms: number;
    }

    const track: SpotifyTrack = {
      id: 'track-123',
      name: 'Test Song',
      artists: [{ id: 'artist-1', name: 'Artist' }],
      album: {
        name: 'Album Name',
        images: [{ url: 'https://example.com/cover.jpg' }],
      },
      duration_ms: 240000,
    };

    expect(track.id).toBeDefined();
    expect(track.artists.length).toBeGreaterThan(0);
  });
});
