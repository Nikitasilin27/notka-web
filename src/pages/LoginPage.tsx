import { Button } from '@gravity-ui/uikit';
import { initiateSpotifyLogin } from '../services/spotify';

export function LoginPage() {
  const handleLogin = () => {
    initiateSpotifyLogin();
  };

  return (
    <div className="login-page">
      <div className="login-logo">🎵</div>
      <h1 className="login-title">Notka</h1>
      <p className="login-subtitle">
        Находи единомышленников по музыкальным вкусам, делись скробблами и открывай новую музыку вместе
      </p>
      <Button
        view="action"
        size="xl"
        className="spotify-button"
        onClick={handleLogin}
      >
        Войти через Spotify
      </Button>
    </div>
  );
}
