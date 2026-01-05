import { useState, useEffect } from 'react';
import { Switch, RadioGroup, Radio, Button } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { Moon, Sun, Globe, ChevronDown, ChevronUp, ArrowRightFromSquare, Heart } from '@gravity-ui/icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n, Language } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { getUser, createOrUpdateUser } from '../services/firebase';

type CrossLikeMode = 'spotify_to_notka' | 'notka_to_spotify' | 'both';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const { logout, spotifyId, refreshUser } = useAuth();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isLikesOpen, setIsLikesOpen] = useState(false);
  const [crossLikeEnabled, setCrossLikeEnabled] = useState(true);
  const [crossLikeMode, setCrossLikeMode] = useState<CrossLikeMode>('spotify_to_notka');
  const [isSaving, setIsSaving] = useState(false);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!spotifyId) return;
      const user = await getUser(spotifyId);
      if (user) {
        setCrossLikeEnabled(user.crossLikeEnabled ?? true);
        // If mode is 'none' (old value), default to 'spotify_to_notka'
        const mode = user.crossLikeMode === 'none' ? 'spotify_to_notka' : (user.crossLikeMode ?? 'spotify_to_notka');
        setCrossLikeMode(mode as CrossLikeMode);
      }
    };
    loadSettings();
  }, [spotifyId]);

  const handleCrossLikeEnabledChange = async (enabled: boolean) => {
    setCrossLikeEnabled(enabled);
    if (!spotifyId) return;
    
    setIsSaving(true);
    await createOrUpdateUser({
      odl: spotifyId,
      crossLikeEnabled: enabled
    });
    await refreshUser();
    setIsSaving(false);
  };

  const handleCrossLikeModeChange = async (mode: CrossLikeMode) => {
    setCrossLikeMode(mode);
    if (!spotifyId) return;
    
    setIsSaving(true);
    await createOrUpdateUser({
      odl: spotifyId,
      crossLikeMode: mode
    });
    await refreshUser();
    setIsSaving(false);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const crossLikeModeLabels = {
    spotify_to_notka: lang === 'ru' ? 'Из Spotify в Notka' : 'From Spotify to Notka',
    notka_to_spotify: lang === 'ru' ? 'Из Notka в Spotify' : 'From Notka to Spotify',
    both: lang === 'ru' ? 'Двусторонняя синхронизация' : 'Two-way sync'
  };

  const crossLikeModeDescriptions = {
    spotify_to_notka: lang === 'ru'
      ? 'Лайки из Spotify будут автоматически добавляться в Notka'
      : 'Likes from Spotify will be automatically added to Notka',
    notka_to_spotify: lang === 'ru'
      ? 'Лайки в Notka будут добавляться в вашу библиотеку Spotify'
      : 'Likes in Notka will be added to your Spotify library',
    both: lang === 'ru'
      ? 'Лайки синхронизируются в обоих направлениях'
      : 'Likes sync in both directions'
  };

  return (
    <div className="settings-page">
      <h1 className="page-title">{t.settings}</h1>
      
      <div className="settings-list">
        {/* Theme toggle */}
        <div className="settings-item">
          <div className="settings-item-info">
            <Icon data={theme === 'dark' ? Moon : Sun} size={20} />
            <span>{t.darkTheme}</span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onUpdate={toggleTheme}
            size="m"
          />
        </div>
        
        {/* Language selector - custom accordion */}
        <div className="settings-accordion">
          <button 
            className="settings-accordion-header"
            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
          >
            <div className="settings-item-info">
              <Icon data={Globe} size={20} />
              <span>{t.language}</span>
            </div>
            <Icon data={isLanguageOpen ? ChevronUp : ChevronDown} size={16} />
          </button>
          
          {isLanguageOpen && (
            <div className="settings-accordion-content">
              <RadioGroup
                value={lang}
                onUpdate={(value) => setLang(value as Language)}
                direction="vertical"
              >
                <Radio value="ru">
                  <div className="language-option">
                    <span className="language-name">Русский</span>
                    <span className="language-native">Russian</span>
                  </div>
                </Radio>
                <Radio value="en">
                  <div className="language-option">
                    <span className="language-name">English</span>
                    <span className="language-native">English</span>
                  </div>
                </Radio>
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Cross-likes settings */}
        <div className="settings-item">
          <div className="settings-item-info">
            <Icon data={Heart} size={20} />
            <div className="settings-item-text">
              <span>{lang === 'ru' ? 'Синхронизация лайков' : 'Like sync'}</span>
              <span className="settings-item-description">
                {lang === 'ru' ? 'Между Spotify и Notka' : 'Between Spotify and Notka'}
              </span>
            </div>
          </div>
          <Switch
            checked={crossLikeEnabled}
            onUpdate={handleCrossLikeEnabledChange}
            size="m"
            disabled={isSaving}
          />
        </div>
        
        {crossLikeEnabled && (
          <div className="settings-accordion">
            <button 
              className="settings-accordion-header"
              onClick={() => setIsLikesOpen(!isLikesOpen)}
            >
              <div className="settings-item-info">
                <span style={{ marginLeft: 28 }}>
                  {lang === 'ru' ? 'Режим синхронизации' : 'Sync mode'}
                </span>
              </div>
              <div className="settings-mode-value">
                <span>{crossLikeModeLabels[crossLikeMode]}</span>
                <Icon data={isLikesOpen ? ChevronUp : ChevronDown} size={16} />
              </div>
            </button>
            
            {isLikesOpen && (
              <div className="settings-accordion-content">
                <RadioGroup
                  value={crossLikeMode}
                  onUpdate={(value) => handleCrossLikeModeChange(value as CrossLikeMode)}
                  direction="vertical"
                  disabled={isSaving}
                >
                  {(['spotify_to_notka', 'notka_to_spotify', 'both'] as CrossLikeMode[]).map(mode => (
                    <Radio key={mode} value={mode}>
                      <div className="cross-like-option">
                        <span className="cross-like-label">{crossLikeModeLabels[mode]}</span>
                        <span className="cross-like-description">{crossLikeModeDescriptions[mode]}</span>
                      </div>
                    </Radio>
                  ))}
                </RadioGroup>
                </div>
              )}
            </div>
          )}

        {/* Logout button - primarily for mobile */}
        <div className="settings-logout">
          <Button
            view="outlined-danger"
            size="l"
            width="max"
            onClick={handleLogout}
          >
            <Icon data={ArrowRightFromSquare} size={16} />
            {t.logout}
          </Button>
        </div>
      </div>
    </div>
  );
}
