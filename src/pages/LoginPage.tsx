import { Button, Text, Icon, DropdownMenu } from '@gravity-ui/uikit';
import { ChevronDown } from '@gravity-ui/icons';
import { initiateSpotifyLogin } from '../services/spotify';
import { useI18n } from '../hooks/useI18n';

// Brand icons as Gravity UI compatible icon data
const SpotifyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const AppleMusicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 88 88" fill="#FA2D48">
    <path d="M44,0 C19.738,0 0,19.738 0,44 C0,68.262 19.738,88 44,88 C68.262,88 88,68.262 88,44 C88,19.738 68.262,0 44,0 Z M64.685,29.458 L64.685,57.107 C64.685,58.776 64.408,60.264 63.512,61.412 C62.344,62.914 60.349,63.858 58.012,63.858 C54.847,63.858 52.169,61.821 51.616,59.044 C51.063,56.266 52.693,53.544 55.544,52.449 C56.893,51.935 58.343,51.699 59.753,51.418 C61.028,51.163 62.269,50.885 62.954,49.836 C63.349,49.233 63.453,48.502 63.453,47.782 L63.453,35.041 C63.453,34.573 63.281,34.12 62.823,33.97 C62.342,33.812 61.872,33.98 61.392,34.073 L40.209,38.571 C39.452,38.734 39.052,39.169 38.979,39.948 C38.963,40.123 38.963,40.3 38.963,40.476 L38.963,62.997 C38.963,64.709 38.669,66.28 37.714,67.485 C36.53,68.98 34.544,69.906 32.233,69.906 C29.095,69.906 26.435,67.886 25.865,65.141 C25.294,62.395 26.906,59.698 29.732,58.593 C31.065,58.086 32.499,57.858 33.889,57.581 C35.181,57.321 36.414,57.036 37.109,55.972 C37.497,55.392 37.617,54.68 37.617,53.976 L37.617,30.345 C37.617,29.292 37.858,28.328 38.685,27.618 C39.363,27.032 40.263,26.759 41.147,26.566 L62.162,22.057 C63.088,21.854 64.051,21.679 64.87,22.287 C65.589,22.822 65.912,23.674 65.912,24.546 L65.912,29.458 L64.685,29.458 Z"/>
  </svg>
);

const YandexMusicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#FFCC00"/>
    <path fill="#000" d="M12 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4zm2.4 4.8h-4.8v9.6h2.4v-3.6h2.4c1.325 0 2.4-1.075 2.4-2.4V9.6c0-1.325-1.075-2.4-2.4-2.4zm0 2.4v2.4H12V9.6h2.4z"/>
  </svg>
);

// Music illustration SVG component
const MusicIllustration = () => (
  <svg 
    id="freepik_stories-music" 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 500 500"
    width="200"
    height="200"
  >
    <g id="freepik--musical-notes--inject-2">
      <path d="M219.23,374.25a45.79,45.79,0,1,1-30.65-57.06A45.79,45.79,0,0,1,219.23,374.25Z" fill="#455a64"/>
      <rect x="218.33" y="143.37" width="34.98" height="230.23" transform="translate(-54.5 98.53) rotate(-16.76)" fill="#455a64"/>
      <path d="M380.38,353.2a45.8,45.8,0,1,1-30.65-57.06A45.79,45.79,0,0,1,380.38,353.2Z" fill="#455a64"/>
      <rect x="379.48" y="122.32" width="34.98" height="230.23" transform="translate(-32.67 153.69) rotate(-16.75)" fill="#455a64"/>
      <polygon points="446.8 132.7 243.38 172.69 252.25 143.21 455.67 103.23 446.8 132.7" fill="#455a64"/>
      <polygon points="430.07 188.25 226.66 228.24 235.53 198.77 438.94 158.78 430.07 188.25" fill="#455a64"/>
      <path d="M55.91,194.71A6.07,6.07,0,1,1,53,186.65,6.08,6.08,0,0,1,55.91,194.71Z" fill="#455a64"/>
      <rect x="57.95" y="164.58" width="4.64" height="30.52" transform="translate(-68.52 44.73) rotate(-24.93)" fill="#455a64"/>
      <path d="M77.44,195a6.07,6.07,0,1,1-2.94-8.06A6.07,6.07,0,0,1,77.44,195Z" fill="#455a64"/>
      <rect x="79.49" y="164.86" width="4.64" height="30.52" transform="translate(-64.52 54.69) rotate(-24.94)" fill="#455a64"/>
      <polygon points="90.32 167.31 62.88 168.72 64.6 165.03 92.04 163.62 90.32 167.31" fill="#455a64"/>
    </g>
    <g id="freepik--speech-bubble--inject-2">
      <path d="M454.11,77.83a22.07,22.07,0,0,1-36.89,14l-11.05,1.63,5.53-9.55a22.08,22.08,0,1,1,42.41-6Z" fill="#fff"/>
      <path d="M454.11,77.83A22.32,22.32,0,0,1,449.65,89a19.68,19.68,0,0,1-4.33,4.28,22.48,22.48,0,0,1-11.27,4.38,21,21,0,0,1-3.07.06,18.58,18.58,0,0,1-3.06-.32A22.27,22.27,0,0,1,417,92l.26.08-11,1.69-.8.13.4-.71,5.5-9.57,0,.38a22.33,22.33,0,0,1,1.36-19.68A22.55,22.55,0,0,1,419.58,57,22.16,22.16,0,0,1,429,53.45a22,22,0,0,1,18.5,6.15A22.23,22.23,0,0,1,454.11,77.83Z" fill="#263238"/>
      <path d="M441.51,79.7a28.86,28.86,0,0,1-9.28,8,28.89,28.89,0,0,1-9.27-8c-3.26-4.33-3.1-11.09,1.57-12.55,5.16-1.62,7.7,6.15,7.7,6.15s2.58-7.82,7.71-6.15C444.59,68.66,444.77,75.37,441.51,79.7Z" fill="#FF7700"/>
    </g>
  </svg>
);

export function LoginPage() {
  const { lang, setLang, t } = useI18n();
  
  const handleSpotifyLogin = () => {
    initiateSpotifyLogin();
  };

  const languageItems = [
    { 
      action: () => setLang('ru'), 
      text: t.russian,
      selected: lang === 'ru'
    },
    { 
      action: () => setLang('en'), 
      text: t.english,
      selected: lang === 'en'
    },
  ];

  return (
    <div className="login-page">
      {/* Language selector in top right */}
      <div className="login-lang-selector">
        <DropdownMenu
          items={languageItems}
          switcher={
            <Button view="outlined" size="m">
              {lang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
              <Icon data={ChevronDown} size={16} />
            </Button>
          }
        />
      </div>
      
      <div className="login-logo">
        <MusicIllustration />
      </div>
      <h1 className="login-title">Notka</h1>
      <p className="login-subtitle">
        {t.loginSubtitle}
      </p>
      
      <div className="login-buttons">
        <Button
          view="outlined"
          size="xl"
          width="max"
          onClick={handleSpotifyLogin}
          className="login-btn"
        >
          <Icon data={SpotifyIcon} size={18} />
          {t.signInSpotify}
        </Button>
        
        <Button
          view="outlined"
          size="xl"
          width="max"
          disabled
          className="login-btn"
        >
          <Icon data={AppleMusicIcon} size={18} />
          Apple Music
          <span className="login-coming-soon">{t.comingSoon}</span>
        </Button>
        
        <Button
          view="outlined"
          size="xl"
          width="max"
          disabled
          className="login-btn"
        >
          <Icon data={YandexMusicIcon} size={18} />
          {lang === 'ru' ? 'Яндекс Музыка' : 'Yandex Music'}
          <span className="login-coming-soon">{t.comingSoon}</span>
        </Button>
      </div>
      
      <Text variant="body-1" color="secondary" className="login-hint">
        {t.loginHint}
      </Text>
    </div>
  );
}
