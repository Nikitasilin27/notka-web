import { Button, Text } from '@gravity-ui/uikit';
import { initiateSpotifyLogin } from '../services/spotify';
import { useI18n } from '../hooks/useI18n';

export function LoginPage() {
  const { lang } = useI18n();
  
  const handleSpotifyLogin = () => {
    initiateSpotifyLogin();
  };

  return (
    <div className="login-page">
      <div className="login-logo">🎵</div>
      <h1 className="login-title">Notka</h1>
      <p className="login-subtitle">
        {lang === 'ru'
          ? 'Находи единомышленников по музыкальным вкусам, делись скробблами и открывай новую музыку вместе.'
          : 'Find like-minded music lovers, share scrobbles, and discover new music together.'
        }
      </p>
      
      <div className="login-buttons">
        <Button
          view="outlined"
          size="xl"
          width="max"
          onClick={handleSpotifyLogin}
        >
          {lang === 'ru' ? 'Войти со Spotify' : 'Sign in with Spotify'}
        </Button>
        
        <Button
          view="outlined"
          size="xl"
          width="max"
          disabled
        >
          Apple Music
        </Button>
        
        <Button
          view="outlined"
          size="xl"
          width="max"
          disabled
        >
          {lang === 'ru' ? 'Яндекс Музыка' : 'Yandex Music'}
        </Button>
      </div>
      
      <Text variant="body-1" color="secondary" className="login-hint">
        {lang === 'ru'
          ? 'Apple Music и Яндекс Музыка в разработке. Вход через Spotify недоступен из России без VPN.'
          : 'Apple Music and Yandex Music are coming soon. Spotify login is not available from Russia without VPN.'
        }
      </Text>
    </div>
  );
}
