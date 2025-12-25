import { SpotifyCurrentlyPlaying } from '../types';

interface NowPlayingProps {
  currentlyPlaying: SpotifyCurrentlyPlaying | null;
}

export function NowPlaying({ currentlyPlaying }: NowPlayingProps) {
  if (!currentlyPlaying?.item) {
    return (
      <div className="now-playing">
        <div className="now-playing-art" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--g-color-base-generic)',
          fontSize: 24
        }}>
          🎵
        </div>
        <div className="now-playing-info">
          <div className="now-playing-track">Ничего не играет</div>
          <div className="now-playing-artist">Включи музыку в Spotify</div>
        </div>
      </div>
    );
  }

  const track = currentlyPlaying.item;
  const albumArt = track.album.images[0]?.url;

  return (
    <div className="now-playing">
      {albumArt ? (
        <img src={albumArt} alt={track.album.name} className="now-playing-art" />
      ) : (
        <div className="now-playing-art" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--g-color-base-generic)',
          fontSize: 24
        }}>
          🎵
        </div>
      )}
      <div className="now-playing-info">
        <div className="now-playing-track">{track.name}</div>
        <div className="now-playing-artist">
          {track.artists.map(a => a.name).join(', ')}
        </div>
      </div>
      <div className="now-playing-status">
        {currentlyPlaying.is_playing && (
          <>
            <span className="now-playing-pulse" />
            Сейчас играет
          </>
        )}
      </div>
    </div>
  );
}
